const ADMIN_KEY = process.env.ADMIN_KEY || "emmy123@.com";

export function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key && key === ADMIN_KEY) return next();
  return res.status(401).json({ error: "Invalid or missing admin key." });
}

export { ADMIN_KEY };
