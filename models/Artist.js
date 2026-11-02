import mongoose from "mongoose";

const artistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    spotifyId: { type: String, required: true, unique: true },
    imageUrl: { type: String },
    genres: [String],
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // For the claim feature
  },
  { timestamps: true },
);

export default mongoose.model("Artist", artistSchema);
