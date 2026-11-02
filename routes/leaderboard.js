import express from "express";
import Vote from "../models/Vote.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.get("/", optionalAuth, async (req, res) => {
  try {
    const cycleId = "baze_wk12_kenya";
    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId } },
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
        cycleId,
      }).select("trackId");
      myVotes = userVotes.map((v) => v.trackId);
      votesRemaining = req.user.votesRemaining;
    }

    res.json({ counts, myVotes, votesRemaining });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
