import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Fetch all data and populate the references
    const tracks = await Track.find()
      .populate("artistId", "name imageUrl claimedBy")
      .populate("albumId", "title artworkUrl")
      .lean();

    const artists = await Artist.find().lean();
    const albums = await Album.find().lean();

    res.json({ tracks, artists, albums });
  } catch (err) {
    console.error("Catalog fetch error:", err);
    res.status(500).json({ error: "Failed to load catalog" });
  }
});

export default router;
