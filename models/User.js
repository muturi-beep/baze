import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    displayName: { type: String, default: "Baze Fan" },
    verified: { type: Boolean, default: false },
    roles: { type: [String], default: ["fan"] },
    claimedArtistId: { type: String, default: null },
    votesRemaining: { type: Number, default: 10 },
    cycleId: { type: String, default: "baze_wk12_kenya" },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
