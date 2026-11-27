import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true }, 
  currency: { type: String, default: "KES" },
  method: { type: String, enum: ["single_vote", "weekly_pass"], required: true },
  status: { type: String, enum: ["pending", "successful", "failed"], default: "pending" },
  provider: { type: String, required: true }, 
  providerTransactionId: { type: String, unique: true, sparse: true }, 
  cycleId: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);