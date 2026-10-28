import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true }, // email or phone
    channel: { type: String, required: true }, // "email" or "sms"
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  { timestamps: true },
);

// Compound index for fast lookup
otpCodeSchema.index({ identifier: 1, createdAt: -1 });

export default mongoose.model("OtpCode", otpCodeSchema);
