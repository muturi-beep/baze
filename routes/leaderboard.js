import express from "express";
import Vote from "../models/Vote.js";
import Cycle from "../models/Cycle.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.get("/", optionalAuth, async (req, res) => {
  try {
    // 1. Get current open cycle
    let cycle = await Cycle.findOne({ status: "open" });
    
    // 🚨 FIX: If no open cycle, OR it has expired, create a brand new one!
    if (!cycle || new Date() > new Date(cycle.endsAt)) {
      if (cycle) {
        cycle.status = "closed";
        await cycle.save();
      }
      
      const nextWeek = cycle ? cycle.weekNumber + 1 : 1;
      cycle = await Cycle.create({
        cycleId: `baze_wk${nextWeek}_kenya`,
        weekNumber: nextWeek,
        status: "open",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      console.log(`🚀 Auto-started new cycle: ${cycle.cycleId}`);
    }

    const voteAggregation = await Vote.aggregate([
      { $match: { cycleId: cycle.cycleId } },
      { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } }
    ]);

    const counts = {};
    voteAggregation.forEach((item) => { counts[item._id] = item.totalVotes; });

    let myVotes = [];
    let votesRemaining = 10;
    if (req.user) {
      const userVotes = await Vote.find({ voterId: req.user._id, cycleId: cycle.cycleId }).select("trackId");
      myVotes = userVotes.map(v => v.trackId);
      votesRemaining = req.user.votesRemaining;
    }

    res.json({ 
      counts, 
      myVotes, 
      votesRemaining,
      cycle: {
        id: cycle.cycleId,
        weekNumber: cycle.weekNumber,
        endsAt: cycle.endsAt
      }
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;