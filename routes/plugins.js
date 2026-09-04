import express from "express";
import crypto from "crypto";
import { readAll, getById, insert, update, remove } from "../lib/db.js";
import { validateCode } from "../lib/validateCode.js";
import { requireAdmin } from "../lib/adminAuth.js";

const router = express.Router();

function publicView(p) {
  // Never leak submitter code / notes in the public list, only metadata.
  const { code, ...rest } = p;
  return rest;
}

/* ── PUBLIC: list accepted plugins ─────────────────────────────── */
router.get("/", async (req, res) => {
  const list = await readAll();
  res.json(list.filter((p) => p.status === "accepted").map(publicView));
});

/* ── PUBLIC: submit a new plugin for review ────────────────────── */
router.post("/", async (req, res) => {
  const { name, author, description, category, code } = req.body || {};

  if (!name || !author || !code) {
    return res.status(400).json({ error: "name, author and code are required." });
  }

  const check = validateCode(code);
  if (!check.valid) {
    return res.status(400).json({ error: check.error });
  }

  const plugin = {
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 120),
    author: String(author).trim().slice(0, 80),
    description: String(description || "").trim().slice(0, 500),
    category: String(category || "general").trim().slice(0, 40),
    code,
    status: "pending",
    rawUrl: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    rejectReason: null,
  };

  await insert(plugin);
  res.status(201).json(publicView(plugin));
});

/* ── ADMIN: list pending submissions (includes code) ───────────── */
router.get("/pending", requireAdmin, async (req, res) => {
  const list = await readAll();
  res.json(list.filter((p) => p.status === "pending"));
});

/* ── ADMIN: list everything (for a full dashboard view) ─────────── */
router.get("/all", requireAdmin, async (req, res) => {
  res.json(await readAll());
});

/* ── ADMIN: fetch one submission with code ──────────────────────── */
router.get("/:id/full", requireAdmin, async (req, res) => {
  const plugin = await getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });
  res.json(plugin);
});

/* ── ADMIN: accept -> plugin becomes permanently servable ───────── */
router.post("/:id/accept", requireAdmin, async (req, res) => {
  const plugin = await getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });

  const check = validateCode(plugin.code);
  if (!check.valid) {
    return res.status(400).json({ error: `Cannot accept, code no longer valid: ${check.error}` });
  }

  const host = `${req.protocol}://${req.get("host")}`;
  const rawUrl = `${host}/raw/${plugin.id}.js`;

  // This write goes to MongoDB, not local disk, so it survives restarts,
  // redeploys, and moving to a different server. It only ever goes away
  // if an admin calls DELETE /api/plugins/:id.
  const updated = await update(plugin.id, {
    status: "accepted",
    rawUrl,
    reviewedAt: new Date().toISOString(),
    rejectReason: null,
  });

  res.json(updated);
});

/* ── ADMIN: reject ───────────────────────────────────────────────── */
router.post("/:id/reject", requireAdmin, async (req, res) => {
  const plugin = await getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });

  const updated = await update(plugin.id, {
    status: "rejected",
    rawUrl: null,
    reviewedAt: new Date().toISOString(),
    rejectReason: (req.body && req.body.reason) || "Not specified.",
  });

  res.json(updated);
});

/* ── ADMIN: delete a submission entirely (the ONLY way it disappears) */
router.delete("/:id", requireAdmin, async (req, res) => {
  const ok = await remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found." });
  res.json({ deleted: true });
});

export default router;
