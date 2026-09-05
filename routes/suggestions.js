import express from "express";
import crypto from "crypto";
import { insertSuggestion, readAllSuggestions } from "../lib/db.js";
import { requireAdmin } from "../lib/adminAuth.js";

const router = express.Router();

/* ── PUBLIC: submit a suggestion ─────────────────────────────────
   Body: { name, whatsapp, message } — name and whatsapp are optional,
   message is required. No admin key needed; anyone visiting the site
   can send one. */
router.post("/", async (req, res) => {
  const { name, whatsapp, message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "A message is required." });
  }

  const suggestion = {
    id: crypto.randomUUID(),
    name: String(name || "").trim().slice(0, 80),
    whatsapp: String(whatsapp || "").trim().slice(0, 20),
    message: String(message).trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
  };

  await insertSuggestion(suggestion);
  res.status(201).json({ success: true });
});

/* ── ADMIN: list all suggestions ──────────────────────────────── */
router.get("/", requireAdmin, async (req, res) => {
  res.json(await readAllSuggestions());
});

export default router;
