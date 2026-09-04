import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import pluginsRouter from "./routes/plugins.js";
import rawRouter from "./routes/raw.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

/* ✅ CORS — MUST BE BEFORE ROUTES */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
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

app.listen(PORT, () => {
  console.log(`Plugin Hub running on port ${PORT}`);
});

export default app;
