import Stripe from 'stripe';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// @route  POST /api/payments/deposit
export const deposit = async (req, res) => {
  try {
    const { amount, paymentMethodId } = req.body;
    const amountCents = Math.round(amount * 100);

    let paymentIntent = null;
    let status = 'completed';
    let intentId = 'mock_stripe_' + Date.now();
    let description = 'Deposit via Stripe (Simulated)';

    const isStripeConfigured = process.env.STRIPE_SECRET_KEY && 
                               !process.env.STRIPE_SECRET_KEY.includes('YOUR_STRIPE_KEY_HERE');

    if (isStripeConfigured && paymentMethodId) {
      // Create Stripe PaymentIntent
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { userId: req.user._id.toString() },
      });
      status = paymentIntent.status === 'succeeded' ? 'completed' : 'pending';
      intentId = paymentIntent.id;
      description = 'Deposit via Stripe';
    } else {
      console.log('Skipping Stripe: Using simulated deposit success.');
    }

    // Record transaction
    const txn = await Transaction.create({
      userId: req.user._id,
      type: 'deposit',
      amount,
      status: status,
      stripePaymentIntentId: intentId,
      description: description,
    });

    if (status === 'completed') {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { walletBalance: amount },
      });
    }

    res.json({ transaction: txn, paymentIntent });
  } catch (err) {
    // Record failed transaction
    await Transaction.create({
      userId: req.user._id,
      type: 'deposit',
      amount: req.body.amount,
      status: 'failed',
      description: err.message,
    });
    res.status(400).json({ message: err.message });
  }
};

// @route  POST /api/payments/withdraw
export const withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user._id);

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    const txn = await Transaction.create({
      userId: req.user._id,
      type: 'withdraw',
      amount,
      status: 'completed',
      description: 'Withdrawal request',
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { walletBalance: -amount },
    });

    res.json({ transaction: txn, walletBalance: user.walletBalance - amount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/payments/transfer
export const transfer = async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;
    const sender = await User.findById(req.user._id);

    if (!sender) return res.status(404).json({ message: 'Sender not found.' });
    if (sender.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    const receiver = await User.findById(toUserId);
    if (!receiver) return res.status(404).json({ message: 'Recipient not found.' });

    // Debit sender
    await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: -amount } });
    // Credit receiver
    await User.findByIdAndUpdate(toUserId, { $inc: { walletBalance: amount } });

    // Record both legs
    const [outTxn] = await Promise.all([
      Transaction.create({
        userId: req.user._id,
        type: 'transfer-out',
        amount,
        status: 'completed',
        counterpartyId: toUserId,
        description: description || `Transfer to ${receiver.name}`,
      }),
      Transaction.create({
        userId: toUserId,
        type: 'transfer-in',
        amount,
        status: 'completed',
        counterpartyId: req.user._id,
        description: description || `Transfer from ${sender.name}`,
      }),
    ]);

    res.json({ transaction: outTxn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/payments/transactions
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('counterpartyId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments({ userId: req.user._id });
    const user = await User.findById(req.user._id, 'walletBalance');

    res.json({
      transactions,
      total,
      page: Number(page),
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/payments/create-intent (for frontend Stripe Elements)
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { userId: req.user._id.toString() },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
