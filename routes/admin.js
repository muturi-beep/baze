import express from "express";
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
    // 1. Verify Admin
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
        .json({
          error: `Unauthorized. Your email is ${req.user.email}, but ADMIN_EMAIL is ${process.env.ADMIN_EMAIL}`,
        });
    }

    // 2. Get or create the current cycle
    let currentCycle = await Cycle.findOne({ status: "open" });
    if (!currentCycle) {
      currentCycle = await Cycle.create({
        cycleId: "baze_wk12_kenya",
        weekNumber: 12,
        startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(),
      });
    }

    // 3. Aggregate the votes
    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId: currentCycle.cycleId } },
      { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } },
    ]);

    // 4. Fetch track and artist details for the snapshot
    const snapshotResults = [];
    let rank = 1;

    voteAggregation.sort((a, b) => b.totalVotes - a.totalVotes);

    for (const item of voteAggregation) {
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

    // 5. Save to CertifiedResults
    await CertifiedResult.create({
      cycleId: currentCycle.cycleId,
      weekNumber: currentCycle.weekNumber,
      results: snapshotResults,
    });

    // 6. Close the current cycle
    currentCycle.status = "closed";
    await currentCycle.save();

    // 7. Create the new cycle
    const nextWeekNumber = currentCycle.weekNumber + 1;
    const nextCycleId = `baze_wk${nextWeekNumber}_kenya`;

    await Cycle.create({
      cycleId: nextCycleId,
      weekNumber: nextWeekNumber,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    // 8. Reset all users' votes back to 10
    await User.updateMany({}, { $set: { votesRemaining: 10 } });

    res.json({
      success: true,
      message: `Week ${currentCycle.weekNumber} closed. Started Week ${nextWeekNumber}!`,
    });
  } catch (err) {
    console.error("Reset cycle error:", err);
    // Send the exact error to the frontend so we can see it
    res.status(500).json({ error: err.message || "Failed to reset cycle" });
  }
});

export default router;
