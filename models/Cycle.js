import mongoose from "mongoose";

const cycleSchema = new mongoose.Schema({
  cycleId: { type: String, required: true, unique: true },
  weekNumber: { type: Number, required: true },
  status: { type: String, default: "open" }, // "open" | "closed"
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
});

export default mongoose.model("Cycle", cycleSchema);
