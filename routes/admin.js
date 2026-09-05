import express from "express";
import { requireAdmin, getCurrentAdminKey } from "../lib/adminAuth.js";
import { setStoredAdminKey } from "../lib/db.js";

const router = express.Router();

/* ── ADMIN: change the admin password ─────────────────────────────
   Body: { oldKey, newKey }
   The request itself must also carry a valid x-admin-key (requireAdmin),
   and oldKey must match the CURRENT key as an extra confirmation step —
   this stops someone from changing the password just because they were
   left logged in on a shared device. */
router.post("/change-password", requireAdmin, async (req, res) => {
  const { oldKey, newKey } = req.body || {};

  if (!oldKey || !newKey) {
    return res.status(400).json({ error: "oldKey and newKey are both required." });
  }
  if (String(newKey).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const currentKey = await getCurrentAdminKey();
  if (oldKey !== currentKey) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  await setStoredAdminKey(String(newKey));
  res.json({ success: true });
});

export default router;
