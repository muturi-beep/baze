import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  artistName: { type: String, required: true },
  trackTitle: { type: String, required: true },
  youtubeVideoId: { type: String, required: true },
  contactEmail: { type: String, required: true },
  status: { type: String, default: "pending" }, // "pending" | "approved" | "rejected"
}, { timestamps: true });

export default mongoose.model("Submission", submissionSchema);