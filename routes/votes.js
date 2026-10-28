import express from "express";
import mongoose from "mongoose";
import Vote from "../models/Vote.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { cycleId, trackId, artistId } = req.body; // Added artistId here
  const idempotencyKey = req.headers["idempotency-key"];
  const voterId = req.user._id;

  // NEW: Prevent artists from voting for their own tracks
  if (req.user.claimedArtistId && req.user.claimedArtistId === artistId) {
    return res.status(403).json({
      code: "CANNOT_VOTE_FOR_SELF",
      error: "You cannot vote for your own track.",
    });
  }

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }

  if (req.user.votesRemaining <= 0) {
    return res
      .status(400)
      .json({ code: "NO_VOTES_LEFT", error: "You have used all your votes." });
  }

  // Start a transaction (Atlas free tier supports this)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Insert the immutable vote record
    const vote = new Vote({ cycleId, voterId, trackId, idempotencyKey });
    await vote.save({ session });

    // 2. Decrement the user's remaining budget
    const user = await User.findByIdAndUpdate(
      voterId,
      { $inc: { votesRemaining: -1 } },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      voteId: vote._id,
      votesRemaining: user.votesRemaining,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Handle DB-level uniqueness violations
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.idempotencyKey) {
        // Safe retry (network glitch)
        return res
          .status(200)
          .json({ success: true, message: "Idempotent replay" });
      }
      // Compound index violation (already voted for this track)
      return res.status(409).json({
        code: "ALREADY_VOTED",
        error: "You already voted for this track.",
      });
    }

    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
