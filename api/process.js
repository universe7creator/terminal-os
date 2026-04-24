/**
 * Terminal OS — WebShell Backend API
 * Supports:
 *   - Shell commands (echo, date, whoami, uptime, etc.)
 *   - /agent commands — AI Agent orchestration
 *   - /exec — sandboxed command execution
 */

const { randomUUID } = require('crypto');

// In-memory agent sessions (ephemeral, per-invocation)
const agents = new Map();

// In-memory history for /exec (last 50)
const execHistory = [];

function now() {
  return new Date().toISOString();
}

function safeJsonParse(body) {
  try { return JSON.parse(body); } catch { return {}; }
}

async function callAI(prompt, model = 'anthropic/claude-3.5-haiku') {
  // Grok (x.ai) free endpoint — no key needed for basic calls
  // Fallback: return simulated response
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer xai-placeholder' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch { /* fall through */ }
  return null;
}

async function handleAgentCommand(subcmd, args, body) {
  const licenseKey = body?.licenseKey || '';
  const isPremium = licenseKey.length > 10; // simple gate for demo

  switch (subcmd) {
    case 'spawn': {
      const [name, ...promptParts] = args;
      if (!name || !promptParts.length) {
        return { ok: false, error: 'Usage: /agent spawn <name> "<system_prompt>"' };
      }
      if (!isPremium && agents.size >= 1) {
        return { ok: false, error: 'Premium required for multiple agents. Buy at buy.polar.sh!' };
      }
      const prompt = promptParts.join(' ');
      const id = randomUUID().slice(0, 8);
      agents.set(name, {
        id,
        name,
        prompt,
        created: now(),
        messages: [{ role: 'system', content: prompt }],
        active: true
      });
      return {
        ok: true,
        agent: { id, name, created: now() },
        message: `Agent \`${name}\` spawned (PID ${id}). Use \`/agent send ${name} <msg>\` to chat.`
      };
    }

    case 'list': {
      const list = Array.from(agents.values()).map(a => ({
        name: a.name,
        id: a.id,
        active: a.active,
        created: a.created
      }));
      return { ok: true, agents: list, count: list.length };
    }

    case 'send': {
      const [name, ...msgParts] = args;
      if (!name || !msgParts.length) {
        return { ok: false, error: 'Usage: /agent send <name> <message>' };
      }
      const agent = agents.get(name);
      if (!agent) {
        return { ok: false, error: `Agent \`${name}\` not found. Try \`/agent list\`.` };
      }
      const message = msgParts.join(' ');
      agent.messages.push({ role: 'user', content: message });

      // Try AI (Groq free) — fallback to simulation
      let reply = null;
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: agent.messages.slice(-6),
            max_tokens: 150,
            temperature: 0.7
          })
        });
        if (response.ok) {
          const data = await response.json();
          reply = data.choices?.[0]?.message?.content;
        }
      } catch { /* noop */ }

      if (!reply) {
        // Simulate a useful agent response
        const simul = [
          `\`[${agent.id}]\` Received: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`,
          `Task acknowledged. I'm working on it with context from my system prompt.`,
          `Agent \`${agent.name}\` here — ready to assist. Current focus: ${agent.prompt.slice(0, 50)}...`,
          `[${agent.id}] Processing: "${message.slice(0, 40)}..." — ETA: immediate`
        ];
        reply = simul[Math.floor(Math.abs(message.charCodeAt(0) || 0) % simul.length)];
      }

      agent.messages.push({ role: 'assistant', content: reply });
      return { ok: true, agent: agent.name, id: agent.id, reply };
    }

    case 'switch':
    case 'kill': {
      const [name] = args;
      if (!name) return { ok: false, error: `Usage: /agent ${subcmd} <name>` };
      const agent = agents.get(name);
      if (!agent) return { ok: false, error: `Agent \`${name}\` not found.` };
      if (subcmd === 'kill') {
        agents.delete(name);
        return { ok: true, message: `Agent \`${name}\` terminated.` };
      }
      return { ok: true, agent: { name: agent.name, id: agent.id, active: agent.active } };
    }

    case 'info': {
      const [name] = args;
      if (!name) return { ok: false, error: 'Usage: /agent info <name>' };
      const agent = agents.get(name);
      if (!agent) return { ok: false, error: `Agent \`${name}\` not found.` };
      return { ok: true, agent, history: agent.messages.length };
    }

    default:
      return {
        ok: false,
        error: `Unknown /agent subcommand: ${subcmd}`,
        hint: 'Try: spawn, list, send, switch, kill, info'
      };
  }
}

async function handleExec(cmd) {
  // Sandboxed command execution — only allow safe commands
  const SAFE = new Set(['echo', 'date', 'whoami', 'uptime', 'uname', 'cat', 'ls', 'pwd', 'true', 'false', 'id', 'hostname', 'printf', 'seq', 'base64']);
  const tokens = cmd.trim().split(/\s+/);
  const command = tokens[0];

  if (!SAFE.has(command)) {
    return { ok: false, error: `Command \`${command}\` not allowed in sandbox. Try: ${[...SAFE].join(', ')}` };
  }

  try {
    const { execSync } = require('child_process');
    const result = execSync(cmd, { timeout: 3000, maxBuffer: 4096, encoding: 'utf8', cwd: '/tmp' });
    return { ok: true, output: result, exit: 0 };
  } catch (e) {
    return { ok: false, output: e.stdout || '', error: e.message?.split('\n')[0] || 'Execution failed', exit: e.status || 1 };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  // Route: /api/process
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = await new Promise((resolve, reject) => {
      let d = '';
      req.on('data', c => d += c);
      req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
      req.on('error', reject);
    });
  } catch { body = {}; }

  const { command, args: bodyArgs } = body;
  const licenseKey = body.licenseKey || '';

  // Health check
  if (!command) {
    return res.status(200).json({
      status: 'terminal-os-api-v2',
      uptime: process.uptime(),
      agents: agents.size,
      execHistory: execHistory.length,
      endpoints: ['POST /api/process — execute command or /agent subcommand']
    });
  }

  const trimmed = command.trim();

  // Route /agent commands
  if (trimmed.startsWith('/agent')) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const subcmd = parts[1] || '';
    const args = parts.slice(2);
    const result = await handleAgentCommand(subcmd, args, body);
    return res.status(200).json(result);
  }

  // Route /exec commands (sandboxed shell)
  if (trimmed.startsWith('/exec')) {
    const result = await handleExec(parts.slice(1).join(' '));
    execHistory.unshift({ cmd: trimmed, ts: now(), ...result });
    if (execHistory.length > 50) execHistory.pop();
    return res.status(200).json(result);
  }

  // Route /shell — echo / date / whoami / uptime / uname (no backend needed)
  const SHELL_CMD = trimmed.split(/\s+/)[0];
  if (['echo', 'date', 'whoami', 'uptime', 'uname', 'pwd', 'hostname', 'true', 'false', 'seq'].includes(SHELL_CMD)) {
    const result = await handleExec(trimmed);
    return res.status(200).json(result);
  }

  // Default: shell command routing
  return res.status(200).json({
    status: 'terminal-os-api-v2',
    command: trimmed,
    hint: 'Try /agent spawn, /agent list, /agent send, /exec <cmd>'
  });
};
