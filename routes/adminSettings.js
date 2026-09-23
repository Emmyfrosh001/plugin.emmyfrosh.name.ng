import express from "express";
import { requireAdmin, getCurrentAdminKey } from "../lib/adminAuth.js";
import { setStoredAdminKey } from "../lib/db.js";

const router = express.Router();
router.use(requireAdmin);

router.post("/change-password", async (req, res) => {
  const { oldKey, newKey } = req.body || {};

  if (!oldKey || !newKey) {
    return res.status(400).json({ error: "Both current and new password are required." });
  }

  const currentKey = await getCurrentAdminKey();
  if (oldKey !== currentKey) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  if (String(newKey).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  await setStoredAdminKey(String(newKey));
  res.json({ success: true });
});

export default router;
