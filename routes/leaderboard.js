import express from "express";
import Vote from "../models/Vote.js";
import User from "../models/User.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.get("/", optionalAuth, async (req, res) => {
  try {
    const cycleId = "baze_wk12_kenya"; // Hardcoded for now

    // 1. Aggregate total votes per track from the DB
    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId } },
      { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } },
    ]);

    // Convert array to object: { "trk_01": 5, "trk_02": 12 }
    const counts = {};
    voteAggregation.forEach((item) => {
      counts[item._id] = item.totalVotes;
    });

    // 2. Find which tracks THIS user voted for (if logged in)
    let myVotes = [];
    let votesRemaining = 10;

    if (req.user) {
      const userVotes = await Vote.find({
        voterId: req.user._id,
        cycleId,
      }).select("trackId");
      myVotes = userVotes.map((v) => v.trackId);
      votesRemaining = req.user.votesRemaining;
    }

    res.json({
      counts,
      myVotes,
      votesRemaining,
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
