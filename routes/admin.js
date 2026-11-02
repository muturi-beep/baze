import express from "express";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/add-track", requireAuth, async (req, res) => {
  try {
    // 1. Check if the user is the admin
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res
        .status(403)
        .json({ error: "Unauthorized: You are not the admin." });
    }

    const { title, artistName, albumName, youtubeVideoId, genre, artworkUrl } =
      req.body;
    if (!title || !artistName || !youtubeVideoId || !genre) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 2. Find or create the Artist
    let artist = await Artist.findOne({ name: artistName });
    if (!artist) {
      artist = await Artist.create({
        name: artistName,
        spotifyId: "custom_" + Date.now(), // Fake ID for custom artists
        genres: [genre],
      });
    }

    // 3. Find or create the Album (optional)
    let album = null;
    if (albumName) {
      album = await Album.findOne({ title: albumName, artistId: artist._id });
      if (!album) {
        album = await Album.create({
          title: albumName,
          artistId: artist._id,
          spotifyId: "custom_alb_" + Date.now(),
          artworkUrl: artworkUrl || "",
        });
      }
    }

    // 4. Create the Track
    const newTrack = await Track.create({
      title,
      artistId: artist._id,
      albumId: album ? album._id : null,
      youtubeVideoId,
      genre,
      artworkUrl: artworkUrl || "",
      durationMs: 0, // Will be updated later if needed
      spotifyId: "custom_trk_" + Date.now(),
      cycleId: "baze_wk12_kenya", // Current cycle
    });

    res.json({ success: true, track: newTrack });
  } catch (err) {
    console.error("Add track error:", err);
    res.status(500).json({ error: "Failed to add track" });
  }
});

export default router;
