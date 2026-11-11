import express from "express";
import mongoose from "mongoose";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";
import Vote from "../models/Vote.js";
import User from "../models/User.js";
import Cycle from "../models/Cycle.js";
import CertifiedResult from "../models/CertifiedResult.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// ... (Your existing /add-track route stays here) ...

// Get all tracks for management
router.get("/tracks", requireAuth, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const tracks = await Track.find()
      .populate("artistId", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// Delete a track
router.delete("/tracks/:id", requireAuth, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    await Track.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete track" });
  }
});

// Edit a track (Title or YouTube ID)
router.put("/tracks/:id", requireAuth, async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { title, youtubeVideoId } = req.body;
    const updated = await Track.findByIdAndUpdate(
      req.params.id,
      { $set: { title, youtubeVideoId } },
      { new: true },
    );
    res.json({ success: true, track: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update track" });
  }
});

// The Reset Route
router.post("/reset-cycle", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    // If it's a user clicking the button, verify they are the admin
    return requireAuth(req, res, () => {
      if (
        !process.env.ADMIN_EMAIL ||
        req.user.email !== process.env.ADMIN_EMAIL
      ) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      proceedWithReset(req, res);
    });
  }

  // If it's Vercel Cron, proceed immediately
  proceedWithReset(req, res);
});

async function proceedWithReset(req, res) {
  try {
    let currentCycle = await Cycle.findOne({ status: "open" });
    if (!currentCycle) {
      currentCycle = await Cycle.create({
        cycleId: "baze_wk12_kenya",
        weekNumber: 12,
        startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(),
      });
    }

    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId: currentCycle.cycleId } },
      { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } },
    ]);

    const snapshotResults = [];
    let rank = 1;

    voteAggregation.sort((a, b) => b.totalVotes - a.totalVotes);

    for (const item of voteAggregation) {
      if (!mongoose.Types.ObjectId.isValid(item._id)) continue;
      const track = await Track.findById(item._id).populate("artistId");
      if (track) {
        snapshotResults.push({
          trackId: track._id.toString(),
          title: track.title,
          artistName: track.artistId ? track.artistId.name : "Unknown",
          votes: item.totalVotes,
          rank: rank++,
        });
      }
    }

    await CertifiedResult.create({
      cycleId: currentCycle.cycleId,
      weekNumber: currentCycle.weekNumber,
      results: snapshotResults,
    });

    currentCycle.status = "closed";
    await currentCycle.save();

    const nextWeekNumber = currentCycle.weekNumber + 1;
    const nextCycleId = `baze_wk${nextWeekNumber}_kenya`;

    await Cycle.create({
      cycleId: nextCycleId,
      weekNumber: nextWeekNumber,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await Vote.deleteMany({});
    await User.updateMany({}, { $set: { votesRemaining: 10 } });

    res.json({
      success: true,
      message: `Week ${currentCycle.weekNumber} closed. Started Week ${nextWeekNumber}!`,
    });
  } catch (err) {
    console.error("Reset cycle error:", err);
    res.status(500).json({ error: err.message || "Failed to reset cycle" });
  }
}

export default router;
