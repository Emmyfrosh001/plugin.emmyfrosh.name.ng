import crypto from "crypto";
import { getUserBySessionToken } from "./db.js";

/* We use Node's built-in scrypt instead of adding bcrypt as a dependency —
   no extra native module to install, and scrypt is a solid, well-reviewed
   password hash. Format stored: "salt:hash" (both hex). */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(String(password), salt, 64).toString("hex");
  // Constant-time comparison so response timing can't leak the password.
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* Attaches req.user if a valid session token is present; otherwise 401.
   Token can come from the "x-user-token" header (what the frontend uses). */
export async function requireUser(req, res, next) {
  const token = req.headers["x-user-token"];
  const user = await getUserBySessionToken(token);
  if (!user) return res.status(401).json({ error: "Please log in to continue." });
  req.user = user;
  next();
}

/* Like requireUser, but doesn't fail the request if there's no session —
   just leaves req.user undefined. Useful for routes that behave slightly
   differently when logged in without requiring it. */
export async function attachUserIfPresent(req, res, next) {
  const token = req.headers["x-user-token"];
  req.user = (await getUserBySessionToken(token)) || null;
  next();
}
