import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import pluginsRouter from "./routes/plugins.js";
import rawRouter from "./routes/raw.js";
import suggestionsRouter from "./routes/suggestions.js";
import authRouter from "./routes/auth.js";
import adminUsersRouter from "./routes/adminUsers.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

/* ✅ CORS — MUST BE BEFORE ROUTES */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "x-admin-key", "x-user-token"]
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ✅ ROUTES */
app.use("/api/plugins", pluginsRouter);
app.use("/raw", rawRouter);
app.use("/api/suggestions", suggestionsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin/users", adminUsersRouter);

app.listen(PORT, () => {
  console.log(`Plugin Hub running on port ${PORT}`);
});

export default app;
