/**
 * Household Ledger — Cloudflare Pages, advanced mode.
 *
 * This ONE file sits at the root of the repo, next to index.html.
 * No functions/ folder. No subfolders. No brackets in the filename.
 *
 * It intercepts /api/* and serves everything else from the static files.
 *
 * Requires, in Pages > Settings:
 *   KV namespace binding   LEDGER
 *   Environment variable   LEDGER_PASSWORD  (encrypted)
 * Both must be on Production, and you must redeploy after adding them.
 */

const KEY = "household-ledger-v1";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function samePassword(given, expected) {
  if (typeof given !== "string" || typeof expected !== "string") return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

const EMPTY = {
  rev: 0,
  config: { streams: [], bills: [], allowances: [], cushion: 0, periodAnchor: null, trackingStart: null },
  ledger: { paychecks: [], draws: [] },
};

async function handleApi(request, env, route) {
  /* A plain browser visit to /api/load proves this file is live. */
  if (request.method === "GET") {
    return json({
      ok: true,
      route: route,
      storageConnected: !!env.LEDGER,
      passwordSet: !!env.LEDGER_PASSWORD,
      message: "The API is running. The app talks to it with POST.",
    });
  }

  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  if (!env.LEDGER) {
    return json({ error: "Storage isn't connected. Add the LEDGER KV binding in Pages settings, then redeploy." }, 500);
  }
  if (!env.LEDGER_PASSWORD) {
    return json({ error: "No password is set. Add LEDGER_PASSWORD in Pages settings, then redeploy." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Couldn't read that request." }, 400);
  }

  if (!samePassword(body.password, env.LEDGER_PASSWORD)) {
    return json({ error: "That password doesn't match." }, 401);
  }

  if (route === "load") {
    const raw = await env.LEDGER.get(KEY);
    if (!raw) return json(EMPTY);
    try { return json(JSON.parse(raw)); } catch (e) { return json(EMPTY); }
  }

  if (route === "save") {
    const raw = await env.LEDGER.get(KEY);
    let current = EMPTY;
    if (raw) { try { current = JSON.parse(raw); } catch (e) {} }

    const incoming = Number(body.rev);
    if (Number.isFinite(incoming) && incoming < current.rev) {
      return json({
        error: "stale",
        message: "Someone else saved a change first. Reload to pick it up, then redo your edit.",
        rev: current.rev,
        config: current.config,
        ledger: current.ledger,
      }, 409);
    }

    const next = {
      rev: current.rev + 1,
      config: body.config ?? current.config,
      ledger: body.ledger ?? current.ledger,
      savedAt: new Date().toISOString(),
    };
    await env.LEDGER.put(KEY, JSON.stringify(next));
    return json({ rev: next.rev });
  }

  return json({ error: "Unknown route." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url.pathname.slice(5));
    }

    /* Everything else is the app itself. In advanced mode this forwarding
       is mandatory — without it the site returns nothing. */
    return env.ASSETS.fetch(request);
  },
};
