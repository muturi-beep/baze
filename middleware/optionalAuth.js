import Session from "../models/Session.js";
import User from "../models/User.js";

export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.sessionToken;
    if (!token) return next(); // No token, proceed as guest

    const session = await Session.findOne({ token });
    if (!session) return next();

    const user = await User.findById(session.userId);
    if (user) {
      req.user = user;
      req.session = session;
    }
    next();
  } catch (err) {
    next(); // If anything fails, just proceed as a guest
  }
}
