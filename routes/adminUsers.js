import express from "express";
import { requireAdmin } from "../lib/adminAuth.js";
import { getAllUsers, updateUser, findUserByEmail } from "../lib/db.js";
import { hashPassword } from "../lib/userAuth.js";

const router = express.Router();
router.use(requireAdmin);

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };
}

router.get("/", async (req, res) => {
  const users = await getAllUsers();
  res.json(users.map(publicUser));
});

router.patch("/:id", async (req, res) => {
  const { email, password } = req.body || {};
  const patch = {};

  if (email) {
    const normalized = String(email).trim().toLowerCase();
    const existing = await findUserByEmail(normalized);
    if (existing && existing.id !== req.params.id) {
      return res.status(409).json({ error: "Another account already uses that email." });
    }
    patch.email = normalized;
  }

  if (password) {
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    patch.passwordHash = hashPassword(password);
  }

  const updated = await updateUser(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Account not found." });
  res.json(publicUser(updated));
});

export default router;
