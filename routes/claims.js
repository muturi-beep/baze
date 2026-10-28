import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Claim an artist profile
router.post("/artist", requireAuth, async (req, res) => {
  try {
    const { artistId, artistName } = req.body;
    const user = req.user;

    // 1. Check if user already claimed an artist
    if (user.claimedArtistId) {
      return res
        .status(400)
        .json({ error: "You have already claimed a profile." });
    }

    // 2. Update user roles and link the artist
    user.roles = ["fan", "artist"]; // Upgrade role
    user.claimedArtistId = artistId;
    user.displayName = artistName; // Optionally use artist name as display name

    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
