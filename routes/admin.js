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

router.post("/reset-cycle", requireAuth, async (req, res) => {
  try {
    if (!process.env.ADMIN_EMAIL) {
      return res
        .status(500)
        .json({
          error: "ADMIN_EMAIL is missing from Vercel Environment Variables.",
        });
    }
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res
        .status(403)
        .json({ error: `Unauthorized. Your email is ${req.user.email}.` });
    }

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
      // 🚨 FIX: Skip old mock votes (like "trk_01") that are not valid MongoDB ObjectIds
      if (!mongoose.Types.ObjectId.isValid(item._id)) {
        console.log(`Skipping invalid track ID: ${item._id}`);
        continue;
      }

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

    // 🚨 FIX: Delete all old votes so they don't pollute future weeks
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
});

export default router;
