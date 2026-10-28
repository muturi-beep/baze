import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Session from "../models/Session.js";
import OtpCode from "../models/OtpCode.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Limit OTP requests to 3 per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: "Too many requests. Try again in 15 minutes." },
});

const hash = (str) => crypto.createHash("sha256").update(str).digest("hex");

// 1. REQUEST OTP
router.post("/request-otp", otpLimiter, async (req, res) => {
  try {
    const { identifier, channel } = req.body;
    if (!identifier || !channel)
      return res.status(400).json({ error: "Identifier and channel required" });

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // DEV MODE: Log it to the terminal
    console.log(`\n==============================`);
    console.log(`🔑 OTP for ${identifier}: ${code}`);
    console.log(`==============================\n`);

    // Store hashed code in DB
    await OtpCode.create({
      identifier,
      channel,
      codeHash: hash(code),
      expiresAt,
    });

    res.json({ success: true, message: "OTP sent (check terminal)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { identifier, code, channel } = req.body;

    // Find the most recent OTP for this identifier
    const otpRecord = await OtpCode.findOne({ identifier }).sort({
      createdAt: -1,
    });

    if (!otpRecord)
      return res
        .status(400)
        .json({ error: "No code found. Request a new one." });
    if (otpRecord.attempts >= 5)
      return res
        .status(400)
        .json({ error: "Too many attempts. Request a new code." });
    if (new Date() > otpRecord.expiresAt)
      return res.status(400).json({ error: "Code expired." });

    // Check hash
    if (otpRecord.codeHash !== hash(code)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: "Incorrect code." });
    }

    // Success! Delete the OTP so it can't be reused
    await OtpCode.deleteMany({ identifier });

    // Find or create user
    const query =
      channel === "email" ? { email: identifier } : { phone: identifier };
    let user = await User.findOne(query);

    if (!user) {
      user = await User.create({
        ...query,
        verified: true,
        displayName:
          channel === "email" ? identifier.split("@")[0] : "Baze Fan",
      });
    } else if (!user.verified) {
      user.verified = true;
      await user.save();
    }

    // Create Session
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await Session.create({
      userId: user._id,
      token,
      expiresAt,
      userAgent: req.headers["user-agent"],
    });

    // Set HTTP-only cookie
    res.cookie("sessionToken", token, {
      httpOnly: true,
      secure: true, // <--- MUST be true for Vercel
      sameSite: "none", // <--- MUST be "none" for cross-domain
      expires: expiresAt,
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3. GET CURRENT USER
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// 4. LOGOUT
router.post("/logout", requireAuth, async (req, res) => {
  await Session.deleteOne({ _id: req.session._id });
  res.clearCookie("sessionToken");
  res.json({ success: true });
});

export default router;
