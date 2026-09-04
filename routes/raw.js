import express from "express";
import { getById } from "../lib/db.js";
import { readPluginFile } from "../lib/pluginFiles.js";

const router = express.Router();

/* GET /raw/:id.js  -> serves the accepted plugin's source as plain text,
   the same way raw.githubusercontent.com serves a file. Only plugins
   with status "accepted" are servable, even if a file happens to still
   exist on disk. */
router.get("/:file", (req, res) => {
  const id = req.params.file.replace(/\.js$/i, "");
  const plugin = getById(id);

  if (!plugin || plugin.status !== "accepted") {
    return res.status(404).type("text/plain").send("// plugin not found");
  }

  const code = readPluginFile(id);
  if (code === null) {
    return res.status(404).type("text/plain").send("// plugin file missing");
  }

  res.type("application/javascript; charset=utf-8").send(code);
});

export default router;
