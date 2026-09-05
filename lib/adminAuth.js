import { getStoredAdminKey } from "./db.js";

const ENV_ADMIN_KEY = process.env.ADMIN_KEY || "";

export async function getCurrentAdminKey() {
  try {
    const stored = await getStoredAdminKey();
    return stored || ENV_ADMIN_KEY;
  } catch {
    // DB not reachable for some reason — fall back rather than lock everyone out.
    return ENV_ADMIN_KEY;
  }
}

export async function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  const currentKey = await getCurrentAdminKey();
  if (key && key === currentKey) return next();
  return res.status(401).json({ error: "Invalid or missing admin key." });
}

export { ENV_ADMIN_KEY as ADMIN_KEY };
