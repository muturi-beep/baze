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
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
);

// --- BULLETPROOF SERVERLESS DATABASE CONNECTION ---
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  if (!process.env.MONGODB_URI) {
    console.error(
      "❌ FATAL: MONGODB_URI is not defined in environment variables!",
    );
    throw new Error("Missing MONGODB_URI");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err; // Throw to trigger the 500 error below
  }
};

// Middleware to connect DB before EVERY API route
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database connection failed. Check Vercel logs." });
  }
});

// Routes
app.use("/v1/auth", authRoutes);
app.use("/v1/claims", claimsRoutes);
app.use("/v1/votes", voteRoutes);
app.use("/v1/leaderboard", leaderboardRoutes);
app.use("/v1/catalog", catalogRoutes);

app.get("/", (req, res) =>
  res.json({ message: "Baze API is running perfectly." }),
);

// Catch-all for undefined API routes
app.use("/v1/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () =>
    console.log(`🚀 Baze Backend running on http://localhost:${PORT}`),
  );
}

export default app;
