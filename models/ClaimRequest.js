import mongoose from "mongoose";

const claimRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artistId: { type: String, required: true },
    artistName: { type: String, required: true },
    contactInfo: { type: String, required: true }, // IG handle or email
    status: { type: String, default: "pending" }, // "pending" | "approved" | "rejected"
  },
  { timestamps: true },
);

export default mongoose.model("ClaimRequest", claimRequestSchema);
