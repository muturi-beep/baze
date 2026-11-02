import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import claimsRoutes from "./routes/claims.js";
import voteRoutes from "./routes/votes.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import catalogRoutes from "./routes/catalog.js"; // Make sure this is created!

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
);

// --- VERCEL SERVERLESS DATABASE CONNECTION ---
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) return cachedConnection;
  cachedConnection = mongoose
    .connect(process.env.MONGODB_URI)
    .then((m) => {
      console.log("✅ Connected to MongoDB Atlas");
      return m;
    })
    .catch((err) => {
      cachedConnection = null;
      console.error("❌ MongoDB connection error:", err.message);
      throw err;
    });
  return cachedConnection;
};

// Middleware to guarantee DB is connected BEFORE any route runs
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Routes
app.use("/v1/auth", authRoutes);
app.use("/v1/claims", claimsRoutes);
app.use("/v1/votes", voteRoutes);
app.use("/v1/leaderboard", leaderboardRoutes);
app.use("/v1/catalog", catalogRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Baze API is running perfectly." });
});

// Only listen locally. Vercel handles the serverless routing.
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`🚀 Baze Backend running on http://localhost:${PORT}`);
  });
}

export default app;
