export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-polar-event, x-event-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Polar sends event type in headers
    const event = req.headers['x-polar-event'] || req.headers['x-event-type'] || 'unknown';
    console.log(`[WEBHOOK] Polar event: ${event}`);

    if (event === 'checkout.completed') {
      // Log the checkout completion
      console.log('[WEBHOOK] Checkout completed:', JSON.stringify(req.body, null, 2));
      // Premium activation is a future feature — for now just log it
      return res.status(200).json({ received: true, activated: false });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(200).json({ message: 'Processed with errors' });
  }
}
