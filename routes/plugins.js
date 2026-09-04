import express from "express";
import crypto from "crypto";
import { readAll, getById, insert, update, remove } from "../lib/db.js";
import { validateCode } from "../lib/validateCode.js";
import { requireAdmin } from "../lib/adminAuth.js";
import { writePluginFile, deletePluginFile } from "../lib/pluginFiles.js";

const router = express.Router();

function publicView(p) {
  // Never leak submitter code / notes in the public list, only metadata.
  const { code, ...rest } = p;
  return rest;
}

/* ── PUBLIC: list accepted plugins ─────────────────────────────── */
router.get("/", (req, res) => {
  const list = readAll().filter((p) => p.status === "accepted");
  res.json(list.map(publicView));
});

/* ── PUBLIC: submit a new plugin for review ────────────────────── */
router.post("/", (req, res) => {
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

  insert(plugin);
  res.status(201).json(publicView(plugin));
});

/* ── ADMIN: list pending submissions (includes code) ───────────── */
router.get("/pending", requireAdmin, (req, res) => {
  const list = readAll().filter((p) => p.status === "pending");
  res.json(list);
});

/* ── ADMIN: list everything (for a full dashboard view) ─────────── */
router.get("/all", requireAdmin, (req, res) => {
  res.json(readAll());
});

/* ── ADMIN: fetch one submission with code ──────────────────────── */
router.get("/:id/full", requireAdmin, (req, res) => {
  const plugin = getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });
  res.json(plugin);
});

/* ── ADMIN: accept -> writes raw file + assigns raw URL ─────────── */
router.post("/:id/accept", requireAdmin, (req, res) => {
  const plugin = getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });

  const check = validateCode(plugin.code);
  if (!check.valid) {
    return res.status(400).json({ error: `Cannot accept, code no longer valid: ${check.error}` });
  }

  writePluginFile(plugin.id, plugin.code);

  const host = `${req.protocol}://${req.get("host")}`;
  const rawUrl = `${host}/raw/${plugin.id}.js`;

  const updated = update(plugin.id, {
    status: "accepted",
    rawUrl,
    reviewedAt: new Date().toISOString(),
    rejectReason: null,
  });

  res.json(updated);
});

/* ── ADMIN: reject ───────────────────────────────────────────────── */
router.post("/:id/reject", requireAdmin, (req, res) => {
  const plugin = getById(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Not found." });

  deletePluginFile(plugin.id);

  const updated = update(plugin.id, {
    status: "rejected",
    rawUrl: null,
    reviewedAt: new Date().toISOString(),
    rejectReason: (req.body && req.body.reason) || "Not specified.",
  });

  res.json(updated);
});

/* ── ADMIN: delete a submission entirely ─────────────────────────── */
router.delete("/:id", requireAdmin, (req, res) => {
  deletePluginFile(req.params.id);
  const ok = remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found." });
  res.json({ deleted: true });
});

export default router;
