import express from "express";
import crypto from "crypto";
import {
  findUserByEmail,
  findUserByGithubId,
  createUser,
  createSession,
  deleteSession,
} from "../lib/db.js";
import { hashPassword, verifyPassword, requireUser } from "../lib/userAuth.js";

const router = express.Router();

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/* ── Email + password signup ─────────────────────────────────── */
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists. Try logging in instead." });
  }

  const user = {
    id: crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    name: String(name || email).trim().slice(0, 80),
    passwordHash: hashPassword(password),
    githubId: null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
  await createUser(user);
  const token = await createSession(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

/* ── Email + password login ──────────────────────────────────── */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

/* ── Logout ───────────────────────────────────────────────────── */
router.post("/logout", requireUser, async (req, res) => {
  await deleteSession(req.headers["x-user-token"]);
  res.json({ success: true });
});

/* ── Who am I ─────────────────────────────────────────────────── */
router.get("/me", requireUser, async (req, res) => {
  res.json(publicUser(req.user));
});

/* ── GitHub OAuth: step 1 — redirect to GitHub ───────────────────
   Requires a GitHub OAuth App (free, takes 2 minutes to create):
     https://github.com/settings/developers -> "New OAuth App"
   Set these in your .env:
     GITHUB_CLIENT_ID=...
     GITHUB_CLIENT_SECRET=...
     GITHUB_CALLBACK_URL=https://your-site.onrender.com/api/auth/github/callback
   The "Authorization callback URL" in the GitHub app settings must match
   GITHUB_CALLBACK_URL exactly. */
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;
  if (!clientId || !callbackUrl) {
    return res.status(500).send("GitHub login isn't configured yet (missing GITHUB_CLIENT_ID / GITHUB_CALLBACK_URL).");
  }
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", "read:user user:email");
  res.redirect(url.toString());
});

/* ── GitHub OAuth: step 2 — GitHub sends the user back here ─────── */
router.get("/github/callback", async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!code || !clientId || !clientSecret) {
    return res.status(500).send("GitHub login isn't configured correctly.");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(401).send("GitHub login failed — no access token returned.");
    }

    const profileRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "emmyfrosh-plugin-hub" },
    });
    const profile = await profileRes.json();

    let user = await findUserByGithubId(String(profile.id));
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: profile.email || null,
        name: profile.name || profile.login || "GitHub user",
        passwordHash: null,
        githubId: String(profile.id),
        avatarUrl: profile.avatar_url || null,
        createdAt: new Date().toISOString(),
      };
      await createUser(user);
    }

    const sessionToken = await createSession(user.id);
    // Hand the token to the frontend via a redirect with a URL fragment —
    // the frontend JS reads it, stores it, then cleans the URL.
    res.redirect(`/#auth_token=${sessionToken}`);
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.status(500).send("Something went wrong logging in with GitHub.");
  }
});

export default router;
