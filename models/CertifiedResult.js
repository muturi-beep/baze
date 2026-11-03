import mongoose from "mongoose";

const certifiedResultSchema = new mongoose.Schema({
  cycleId: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  certifiedAt: { type: Date, default: Date.now },
  results: [
    {
      trackId: String,
      title: String,
      artistName: String,
      votes: Number,
      rank: Number,
    },
  ],
});

export default mongoose.model("CertifiedResult", certifiedResultSchema);
