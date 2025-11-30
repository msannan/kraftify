const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Create payment intent
router.post('/create-intent', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get booking details
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Verify ownership
    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bookingId: booking.id.toString(),
        customerId: req.user.id.toString(),
        tradespersonId: booking.tradesperson_id.toString(),
      },
    });

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (booking_id, customer_id, tradesperson_id, amount, stripe_payment_intent_id, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bookingId, req.user.id, booking.tradesperson_id, booking.total_amount, paymentIntent.id, 'pending']
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Update payment status
    await pool.query(
      'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = $2',
      ['completed', paymentIntent.id]
    );

    // Update booking status
    const paymentResult = await pool.query(
      'SELECT booking_id FROM payments WHERE stripe_payment_intent_id = $1',
      [paymentIntent.id]
    );

    if (paymentResult.rows.length > 0) {
      await pool.query(
        'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', paymentResult.rows[0].booking_id]
      );
    }
  }

  res.json({ received: true });
});

module.exports = router;

