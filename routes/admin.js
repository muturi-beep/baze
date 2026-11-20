import express from "express";
import mongoose from "mongoose";
import Artist from "../models/Artist.js";
import Album from "../models/Album.js";
import Track from "../models/Track.js";
import Vote from "../models/Vote.js";
import User from "../models/User.js";
import Cycle from "../models/Cycle.js";
import CertifiedResult from "../models/CertifiedResult.js";
import ClaimRequest from "../models/ClaimRequest.js";
import Submission from "../models/Submission.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Helper middleware to check admin
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "You are not logged in. Please log in again." });
  }
  if (!process.env.ADMIN_EMAIL) {
    return res.status(500).json({ error: "ADMIN_EMAIL is missing in Vercel Environment Variables." });
  }
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ 
      error: `Unauthorized. You are logged in as ${req.user.email}, but the Admin is ${process.env.ADMIN_EMAIL}.` 
    });
  }
  next();
};

// --- ADD TRACK ---
router.post("/add-track", requireAuth, adminOnly, async (req, res) => {
  try {
    const { title, artistName, albumName, youtubeVideoId, genre, artworkUrl } = req.body;
    
    let artist = await Artist.findOne({ name: artistName });
    if (!artist) {
      artist = await Artist.create({ name: artistName, spotifyId: "custom_" + Date.now(), genres: [genre] });
    }

    let album = null;
    if (albumName) {
      album = await Album.findOne({ title: albumName, artistId: artist._id });
      if (!album) {
        album = await Album.create({ title: albumName, artistId: artist._id, spotifyId: "custom_alb_" + Date.now(), artworkUrl: artworkUrl || "" });
      }
    }

    const newTrack = await Track.create({
      title, artistId: artist._id, albumId: album ? album._id : null,
      youtubeVideoId, genre, artworkUrl: artworkUrl || "",
      durationMs: 0, spotifyId: "custom_trk_" + Date.now(), cycleId: "baze_wk12_kenya",
    });

    res.json({ success: true, track: newTrack });
  } catch (err) {
    res.status(500).json({ error: "Failed to add track" });
  }
});

// --- GET ALL TRACKS ---
router.get("/tracks", requireAuth, adminOnly, async (req, res) => {
  try {
    const tracks = await Track.find().populate("artistId", "name").sort({ createdAt: -1 }).lean();
    res.json({ tracks });
  } catch (err) {
    console.error("Fetch tracks error:", err);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// --- EDIT TRACK (Full Update) ---
router.put("/tracks/:id", requireAuth, adminOnly, async (req, res) => {
  try {
    const { title, artistName, genre, youtubeVideoId, artworkUrl } = req.body;
    
    // Handle artist change
    let artist = await Artist.findOne({ name: artistName });
    if (!artist) {
      artist = await Artist.create({ name: artistName, spotifyId: "custom_" + Date.now(), genres: [genre] });
    }

    const updated = await Track.findByIdAndUpdate(
      req.params.id,
      { $set: { title, artistId: artist._id, genre, youtubeVideoId, artworkUrl } },
      { new: true }
    );
    res.json({ success: true, track: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update track" });
  }
});

// --- DELETE TRACK ---
router.delete("/tracks/:id", requireAuth, adminOnly, async (req, res) => {
  try {
    await Track.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete track" });
  }
});

// --- CLAIMS & SUBMISSIONS ---
router.get("/claims", requireAuth, adminOnly, async (req, res) => {
  const claims = await ClaimRequest.find({ status: "pending" }).populate("userId", "email").lean();
  res.json({ claims });
});

router.post("/claims/:id/approve", requireAuth, adminOnly, async (req, res) => {
  const claim = await ClaimRequest.findById(req.params.id);
  if (!claim) return res.status(404).json({ error: "Not found" });
  await User.findByIdAndUpdate(claim.userId, { roles: ["fan", "artist"], claimedArtistId: claim.artistId, displayName: claim.artistName });
  claim.status = "approved";
  await claim.save();
  res.json({ success: true });
});

// --- CYCLE RESET ---
router.post("/reset-cycle", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    return requireAuth(req, res, () => {
      if (!process.env.ADMIN_EMAIL || req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      proceedWithReset(req, res);
    });
  }
  proceedWithReset(req, res);
});

async function proceedWithReset(req, res) {
  try {
    let currentCycle = await Cycle.findOne({ status: "open" });
    if (!currentCycle) {
      currentCycle = await Cycle.create({ cycleId: "baze_wk12_kenya", weekNumber: 12, startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endsAt: new Date() });
    }

    const voteAggregation = await Vote.aggregate([{ $match: { cycleId: currentCycle.cycleId } }, { $group: { _id: "$trackId", totalVotes: { $sum: 1 } } }]);
    const snapshotResults = [];
    let rank = 1;
    voteAggregation.sort((a, b) => b.totalVotes - a.totalVotes);

    for (const item of voteAggregation) {
      if (!mongoose.Types.ObjectId.isValid(item._id)) continue;
      const track = await Track.findById(item._id).populate("artistId");
      if (track) {
        snapshotResults.push({ trackId: track._id.toString(), title: track.title, artistName: track.artistId ? track.artistId.name : "Unknown", votes: item.totalVotes, rank: rank++ });
      }
    }

    await CertifiedResult.create({ cycleId: currentCycle.cycleId, weekNumber: currentCycle.weekNumber, results: snapshotResults });
    currentCycle.status = "closed";
    await currentCycle.save();

    const nextWeekNumber = currentCycle.weekNumber + 1;
    await Cycle.create({ cycleId: `baze_wk${nextWeekNumber}_kenya`, weekNumber: nextWeekNumber, startsAt: new Date(), endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    await Vote.deleteMany({});
    await User.updateMany({}, { $set: { votesRemaining: 10 } });
    res.json({ success: true, message: `Week ${currentCycle.weekNumber} closed. Started Week ${nextWeekNumber}!` });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to reset cycle" });
  }
}

export default router;