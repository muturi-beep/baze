import express from "express";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import CertifiedResult from "../models/CertifiedResult.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, max-age=0");

    const allTracks = await Track.find()
      .populate("artistId", "name imageUrl claimedBy")
      .populate("albumId", "title artworkUrl")
      .lean();

    const tracks = allTracks.filter((t) => {
      if (!t.title) return true;
      const title = t.title.toLowerCase();
      // Use word boundaries (\b) so it doesn't accidentally filter out normal words
      const isRemix =
        /\b(remix|instrumental|live|edit|version|reprise|mix)\b/i.test(title);
      return !isRemix;
    });

    const artists = await Artist.find().lean();
    const albums = await Album.find().lean();

    res.json({
      debug: {
        totalTracksInDB: allTracks.length,
        tracksAfterFilter: tracks.length,
      },
      tracks,
      artists,
      albums,
    });
  } catch (err) {
    console.error("Catalog fetch error:", err);
    res.status(500).json({ error: err.message });
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
