import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import claimsRoutes from "./routes/claims.js";
import voteRoutes from "./routes/votes.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import catalogRoutes from "./routes/catalog.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// --- CACHED DATABASE CONNECTION ---
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
};

// Middleware to ensure DB is connected before API routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use("/v1/auth", authRoutes);
app.use("/v1/claims", claimsRoutes);
app.use("/v1/votes", voteRoutes);
app.use("/v1/leaderboard", leaderboardRoutes);
app.use("/v1/catalog", catalogRoutes);

app.get("/", (req, res) => res.json({ message: "Baze API is running." }));

// ONLY listen locally. Vercel handles the server in production.
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () =>
    console.log(`🚀 Local backend on http://localhost:${PORT}`),
  );
}

export default app;
