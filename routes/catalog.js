import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import CertifiedResult from "../models/CertifiedResult.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, max-age=0");

    // 🚨 THE FIX: Exclude remixes, instrumentals, and live versions
    const tracks = await Track.find({
      title: { $not: /remix|instrumental|live|edit|version|reprise|mix/i },
    })
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

router.get("/results", async (req, res) => {
  try {
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
