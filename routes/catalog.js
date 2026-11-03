import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Tell Vercel NOT to cache this response
    res.set("Cache-Control", "no-store, max-age=0");

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

import CertifiedResult from "../models/CertifiedResult.js"; // <-- Add this import at the top

// ... (your existing / route)

// NEW: Get all past certified results
router.get("/results", async (req, res) => {
  try {
    // Fetch results, sorted by most recent week first
    const results = await CertifiedResult.find()
      .sort({ weekNumber: -1 })
      .lean();
    res.json({ results });
  } catch (err) {
    console.error("Failed to load results:", err);
    res.status(500).json({ error: "Failed to load results" });
  }
});

export default router;
