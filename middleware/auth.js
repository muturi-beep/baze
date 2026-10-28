import Session from "../models/Session.js";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.sessionToken;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const session = await Session.findOne({ token });
    if (!session) return res.status(401).json({ error: "Invalid session" });

    const user = await User.findById(session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
