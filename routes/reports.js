import express from "express";
import Report from "../models/Report.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.post("/", optionalAuth, async (req, res) => {
  try {
    const { trackId, reason, details } = req.body;

    if (!trackId || !reason) {
      return res
        .status(400)
        .json({ error: "Track ID and reason are required" });
    }

    await Report.create({
      trackId,
      reason,
      details: details || "",
      reporterId: req.user ? req.user._id : null,
    });

    res.json({ success: true, message: "Report submitted. Thank you!" });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
