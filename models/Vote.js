import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    cycleId: { type: String, required: true },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trackId: { type: String, required: true },
    weight: { type: Number, default: 1.0 },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

// CRITICAL: Prevent a user from voting for the same track twice in one cycle
voteSchema.index({ cycleId: 1, voterId: 1, trackId: 1 }, { unique: true });

export default mongoose.model("Vote", voteSchema);
