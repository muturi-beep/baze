import express from "express";
import mpesa from "daraja-package";
import dotenv from "dotenv";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Cycle from "../models/Cycle.js";

dotenv.config();
const router = express.Router();

// Only initialize M-Pesa if the keys are present
let mobilePay = null;
if (process.env.MPESA_PASSKEY && process.env.MPESA_CONSUMER_KEY) {
  try {
    mobilePay = mpesa({
      consumerSecret: process.env.MPESA_CONSUMER_SECRET,
      consumerKey: process.env.MPESA_CONSUMER_KEY,
      passKey: process.env.MPESA_PASSKEY,
      shortcode: process.env.MPESA_SHORTCODE,
      callbackURL: process.env.MPESA_CALLBACK_URL,
      mpesaBaseUrl: "DEV" // Use DEV for sandbox
    });
    console.log("✅ M-Pesa initialized successfully");
  } catch (err) {
    console.error("❌ M-Pesa Initialization Error:", err.message);
  }
} else {
  console.warn("⚠️ M-Pesa keys are missing. Payments will be disabled.");
}

// 1. Initiate STK Push
router.post("/initiate", async (req, res) => {
  if (!mobilePay) {
    return res.status(503).json({ error: "M-Pesa is not configured on the server. Check Vercel Environment Variables." });
  }

  let { phoneNumber, amount, userId } = req.body;

  if (!phoneNumber || !amount || !userId) {
    return res.status(400).json({ error: "Phone, amount, and userId are required." });
  }

  // 🚨 FIXED: Correct Phone Formatting for daraja-package (Needs 9 digits, no 254, no 0)
  let cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove any non-digits
  
  if (cleanPhone.startsWith('254')) {
    cleanPhone = cleanPhone.substring(3); // 254712345678 -> 712345678
  } else if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1); // 0712345678 -> 712345678
  }

  try {
    // Create a pending payment record in the database
    const payment = await Payment.create({
      userId,
      amount,
      method: Number(amount) === 30 ? "single_vote" : "weekly_pass",
      status: "pending",
      provider: "mpesa",
      cycleId: (await Cycle.findOne({ status: "open" }))?.cycleId || "baze_wk12_kenya",
    });

    // Initiate the STK push
    const result = await mobilePay.express({
      phone: cleanPhone, // This is now exactly 9 digits (e.g., 708374149)
      amount: amount.toString(),
      tillOrPayBillNumber: process.env.MPESA_SHORTCODE,
      account_reference: "BazeVote",
      transaction_desc: "Payment for votes on Baze",
    });

    // Save the CheckoutRequestID so we can match it in the callback
    payment.providerTransactionId = result.CheckoutRequestID;
    await payment.save();

    res.json({ message: "STK Push initiated. Check your phone.", checkoutId: result.CheckoutRequestID });
  } catch (error) {
    // DEEP ERROR LOGGING
    console.error("\n❌ --- SAFARICOM STK PUSH FAILED ---");
    console.error("Message:", error.message);
    if (error.response && error.response.data) {
      console.error("Daraja API Response:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("-----------------------------------\n");
    
    res.status(500).json({ error: "Failed to initiate STK Push. Check backend logs." });
  }
});

// 2. Handle the Callback from Safaricom
router.post("/callback", express.json(), async (req, res) => {
  if (!req.body || !req.body.Body || !req.body.Body.stkCallback) {
    return res.json({ ResultCode: 0, ResultDesc: "Invalid payload but acknowledged" });
  }

  const callbackData = req.body.Body.stkCallback;
  console.log("M-Pesa Callback Received:", callbackData);

  const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData;

  try {
    const payment = await Payment.findOne({ providerTransactionId: CheckoutRequestID });
    
    if (!payment) {
      console.log(`⚠️ Payment record not found for CheckoutID: ${CheckoutRequestID}`);
      return res.json({ ResultCode: 0, ResultDesc: "Callback received" });
    }

    if (ResultCode === 0) {
      console.log(`✅ Payment successful for User: ${payment.userId}`);
      
      payment.status = "successful";
      await payment.save();

      const user = await User.findById(payment.userId);
      if (user) {
        if (payment.method === "single_vote") {
          user.votesRemaining += 1;
        } else if (payment.method === "weekly_pass") {
          const currentCycle = await Cycle.findOne({ status: "open" });
          if (currentCycle) {
            user.weeklyPassCycleId = currentCycle.cycleId;
          }
        }
        await user.save();
        console.log(`🎉 Votes granted to ${user.email}`);
      }
    } else {
      console.log(`❌ Payment failed. Reason: ${ResultDesc}`);
      payment.status = "failed";
      await payment.save();
    }
  } catch (err) {
    console.error("Callback processing error:", err);
  }

  // Acknowledge receipt to Safaricom
  res.json({ ResultCode: 0, ResultDesc: "Callback received successfully" });
});

// 3. Verify Payment Status (For Frontend Polling)
router.get("/verify/:checkoutId", async (req, res) => {
  try {
    const payment = await Payment.findOne({ providerTransactionId: req.params.checkoutId });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    
    res.json({ status: payment.status }); 
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;