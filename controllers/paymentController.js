import { io } from '../server.js';

// TODO: Import your necessary models for your business logic
// import Transaction from '../models/Transaction.js';
// import User from '../models/User.js';
// import Course from '../models/Course.js';

/**
 * @desc    Handle Flutterwave webhook events to confirm payment status.
 * @route   POST /api/payments/flutterwave-webhook
 * @access  Public (secured by a secret hash from Flutterwave)
 */
export const handleFlutterwaveWebhook = async (req, res) => {
  // 1. Verify the webhook signature to ensure it's from Flutterwave
  const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
  const signature = req.headers['verif-hash'];

  if (!signature || (signature !== secretHash)) {
    // This request isn't from Flutterwave. Discard and log for security.
    console.warn('Webhook received with invalid signature.');
    return res.status(401).send('Invalid signature');
  }

  console.log('Flutterwave webhook received and verified.');

  // 2. Process the event payload from the request body
  const payload = req.body;
  const eventType = payload.event;
  const data = payload.data;

  console.log(`Processing event: ${eventType}`);

  // 3. Handle the 'charge.completed' event specifically
  if (eventType === 'charge.completed') {
    // Check if the transaction was successful
    if (data.status === 'successful') {
      const transactionRef = data.tx_ref; // The unique reference you provided
      const amount = data.amount;
      const currency = data.currency;
      const customerEmail = data.customer.email;

      console.log(`Successful payment for transaction reference: ${transactionRef}`);

      try {
        // --- YOUR BUSINESS LOGIC GOES HERE ---
        // 1. Find the transaction in your database using `transactionRef`.
        //    Example: const transaction = await Transaction.findOne({ tx_ref: transactionRef });

        // 2. Verify that the transaction hasn't already been processed to prevent duplicates.
        //    Example: if (transaction.status === 'successful') { return res.status(200).send('Event already handled'); }

        // 3. Verify the payment amount and currency match what you expect.
        //    Example: if (transaction.amount !== amount || transaction.currency !== currency) { /* handle mismatch */ }

        // 4. Update the transaction status in your database to 'successful'.
        //    Example: transaction.status = 'successful'; await transaction.save();

        // 5. Grant the user access to the purchased item (e.g., enroll in a course).
        //    Example: const user = await User.findById(transaction.userId);
        //             user.enrolledCourses.push(transaction.courseId);
        //             await user.save();

        // 6. Send a real-time notification to the user via Socket.IO.
        //    Example: io.to(user._id.toString()).emit('payment_success', { message: 'Payment successful!' });

        console.log(`Successfully processed payment for ${customerEmail}`);
      } catch (error) {
        console.error('Error processing webhook:', error);
        // Return a 500 status to let Flutterwave know something went wrong.
        // Flutterwave will attempt to retry sending the webhook.
        return res.status(500).send('Internal Server Error');
      }
    } else {
      // Handle other statuses like 'failed'
      console.log(`Payment status for tx_ref ${data.tx_ref} is '${data.status}'.`);
    }
  }

  // Acknowledge receipt of the event to Flutterwave
  res.status(200).send('Webhook received');
};