import crypto from "crypto";
import { findUserBySessionToken } from "./db.js";

/**
 * Salted scrypt hashing via Node's built-in crypto module — no bcrypt/
 * argon2 dependency needed. Stored format: "<salt-hex>:<hash-hex>"
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Express middleware: looks up the session token from the x-user-token
 * header, attaches the matching user to req.user, or responds 401.
 * Used by routes/auth.js (/me, /logout) and anywhere else that needs a
 * logged-in regular (non-admin) user — separate from requireAdmin, which
 * checks the single shared x-admin-key instead.
 */
export async function requireUser(req, res, next) {
  const token = req.headers["x-user-token"];
  const user = await findUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({ error: "Not logged in." });
  }
  req.user = user;
  next();
}
