import express from "express";
import Submission from "../models/Submission.js";
import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// 1. PUBLIC: Submit a track
router.post("/", async (req, res) => {
  try {
    const { artistName, trackTitle, youtubeVideoId, contactEmail } = req.body;
    if (!artistName || !trackTitle || !youtubeVideoId || !contactEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await Submission.create({ artistName, trackTitle, youtubeVideoId, contactEmail });
    res.json({ success: true, message: "Submission received! We will review it shortly." });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit track" });
  }
});

// 2. ADMIN: Get all pending submissions
router.get("/pending", requireAuth, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: "Unauthorized" });
  try {
    const submissions = await Submission.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// 3. ADMIN: Approve a submission
router.post("/:id/approve", requireAuth, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: "Unauthorized" });
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    // Create the Artist if they don't exist
    let artist = await Artist.findOne({ name: submission.artistName });
    if (!artist) {
      artist = await Artist.create({
        name: submission.artistName,
        spotifyId: "custom_" + Date.now(),
        genres: ["afro-pop"],
      });
    }

    // Create the Track
    await Track.create({
      title: submission.trackTitle,
      artistId: artist._id,
      youtubeVideoId: submission.youtubeVideoId,
      genre: "afro-pop",
      cycleId: "baze_wk12_kenya",
      spotifyId: "sub_" + Date.now(),
    });

    // Mark submission as approved
    submission.status = "approved";
    await submission.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve submission" });
  }
});

export default router;