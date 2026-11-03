import express from "express";
import Vote from "../models/Vote.js";
import Cycle from "../models/Cycle.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.get("/", optionalAuth, async (req, res) => {
  try {
    // Get the current active cycle dynamically
    let cycle = await Cycle.findOne({ status: "open" });
    if (!cycle) {
      // Fallback if no cycle exists yet
      cycle = {
        cycleId: "baze_wk12_kenya",
        weekNumber: 12,
        endsAt: new Date(Date.now() + 86400000),
      };
    }

    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId: cycle.cycleId } },
      { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } },
    ]);

    const counts = {};
    voteAggregation.forEach((item) => {
      counts[item._id] = item.totalVotes;
    });

    let myVotes = [];
    let votesRemaining = 10;
    if (req.user) {
      const userVotes = await Vote.find({
        voterId: req.user._id,
        cycleId: cycle.cycleId,
      }).select("trackId");
      myVotes = userVotes.map((v) => v.trackId);
      votesRemaining = req.user.votesRemaining;
    }

    res.json({
      counts,
      myVotes,
      votesRemaining,
      cycle: {
        id: cycle.cycleId,
        weekNumber: cycle.weekNumber,
        endsAt: cycle.endsAt,
      },
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
