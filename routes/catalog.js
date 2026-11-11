import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import CertifiedResult from "../models/CertifiedResult.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, max-age=0");

    // 1. Fetch ALL tracks from the database
    const allTracks = await Track.find()
      .populate("artistId", "name imageUrl claimedBy")
      .populate("albumId", "title artworkUrl")
      .lean();

    // 2. Filter out remixes and instrumentals in plain JavaScript
    const tracks = allTracks.filter((t) => {
      const title = t.title.toLowerCase();
      const isRemix = /remix|instrumental|live|edit|version|reprise|mix/i.test(
        title,
      );
      return !isRemix;
    });

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
