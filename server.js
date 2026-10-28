import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import claimsRoutes from "./routes/claims.js";
import voteRoutes from "./routes/votes.js";
import leaderboardRoutes from "./routes/leaderboard.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN, // We will set this in Vercel
    credentials: true,
  }),
);

app.use("/v1/auth", authRoutes);
app.use("/v1/claims", claimsRoutes);
app.use("/v1/votes", voteRoutes);
app.use("/v1/leaderboard", leaderboardRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// --- VERCEL SERVERLESS DATABASE CONNECTION CACHING ---
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

connectDB();

// Only listen locally. Vercel will handle the serverless routing.
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`🚀 Baze Backend running on http://localhost:${PORT}`);
  });
}

export default app;
