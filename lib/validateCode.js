import * as acorn from "acorn";

/**
 * Checks that submitted plugin code is at least syntactically valid
 * JavaScript. This only *parses* the code with acorn — it is never
 * executed, here or anywhere else in this app. Code is only ever shown
 * to an admin for manual review, and later served back out as a plain
 * static file once accepted.
 *
 * Tries ES module syntax first (import/export, top-level await — the
 * common style for WhatsApp bot plugins), then falls back to plain
 * script syntax so CommonJS-style submissions still validate.
 */
export function validateCode(code) {
  if (typeof code !== "string" || code.trim().length === 0) {
    return { valid: false, error: "Plugin code is empty." };
  }
  if (code.length > 200_000) {
    return { valid: false, error: "Plugin code is too large (200KB limit)." };
  }

  const opts = { ecmaVersion: "latest" };

  try {
    acorn.parse(code, { ...opts, sourceType: "module" });
    return { valid: true };
  } catch (moduleErr) {
    try {
      acorn.parse(code, { ...opts, sourceType: "script" });
      return { valid: true };
    } catch (scriptErr) {
      return { valid: false, error: `Syntax error: ${moduleErr.message}` };
    }
  }
}
