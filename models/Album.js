import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
    },
    spotifyId: { type: String, required: true, unique: true },
    artworkUrl: { type: String },
    releaseDate: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("Album", albumSchema);
