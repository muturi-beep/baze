import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional: who reported it
    reason: { type: String, required: true },
    details: { type: String },
    status: { type: String, default: "pending" }, // "pending" | "resolved"
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
