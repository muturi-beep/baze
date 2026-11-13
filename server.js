import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import dns from "node:dns";
import os from "node:os";

import authRoutes from "./routes/auth.js";
import claimsRoutes from "./routes/claims.js";
import voteRoutes from "./routes/votes.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import catalogRoutes from "./routes/catalog.js";
import adminRoutes from "./routes/admin.js";
import reportRoutes from "./routes/reports.js";
import shareRoutes from "./routes/share.js";

dotenv.config();

// Only force Google DNS on Windows, NEVER on Vercel (Linux)
if (os.platform() === "win32") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in Environment Variables");
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    throw err;
  }
};

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// Routes
app.use("/v1/auth", authRoutes);
app.use("/v1/claims", claimsRoutes);
app.use("/v1/votes", voteRoutes);
app.use("/v1/leaderboard", leaderboardRoutes);
app.use("/v1/catalog", catalogRoutes);
app.use("/v1/admin", adminRoutes);
app.use("/v1/reports", reportRoutes);
app.use("/share", shareRoutes);

app.get("/", (req, res) => res.json({ message: "Baze API is running." }));

// Never listen on Vercel. Only listen locally.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => console.log(`🚀 Local backend on http://localhost:${PORT}`));
}

export default app;