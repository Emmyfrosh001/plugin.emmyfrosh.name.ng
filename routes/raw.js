import express from "express";
import { getById } from "../lib/db.js";

const router = express.Router();

/* GET /raw/:id.js  -> serves the accepted plugin's source as plain text,
   the same way raw.githubusercontent.com serves a file. Only plugins
   with status "accepted" are servable. The code now comes straight from
   MongoDB, so this keeps working after restarts/redeploys. */
router.get("/:file", async (req, res) => {
  const id = req.params.file.replace(/\.js$/i, "");
  const plugin = await getById(id);

  if (!plugin || plugin.status !== "accepted") {
    return res.status(404).type("text/plain").send("// plugin not found");
  }

  res.type("application/javascript; charset=utf-8").send(plugin.code);
});

export default router;
