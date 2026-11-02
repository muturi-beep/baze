import mongoose from "mongoose";

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
    },
    albumId: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
    spotifyId: { type: String, required: true, unique: true },
    youtubeVideoId: { type: String }, // This is what you'll use for the embed player
    durationMs: { type: Number },
    artworkUrl: { type: String },
    genre: { type: String }, // For your genre filters
    cycleId: { type: String }, // To associate tracks with a specific week/cycle
  },
  { timestamps: true },
);

// Index for fast leaderboard aggregation
trackSchema.index({ cycleId: 1, genre: 1 });

export default mongoose.model("Track", trackSchema);
