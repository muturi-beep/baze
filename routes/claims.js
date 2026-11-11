import express from "express";
import ClaimRequest from "../models/ClaimRequest.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/request", requireAuth, async (req, res) => {
  try {
    const { artistId, artistName, contactInfo } = req.body;

    // Check if there is already a pending request for this artist
    const existing = await ClaimRequest.findOne({
      artistId,
      status: "pending",
    });
    if (existing) {
      return res
        .status(400)
        .json({ error: "There is already a pending claim for this artist." });
    }

    await ClaimRequest.create({
      userId: req.user._id,
      artistId,
      artistName,
      contactInfo,
    });

    res.json({ success: true, message: "Claim submitted for review." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit claim" });
  }
});

export default router;
