/**
 * Household Ledger API — Cloudflare Pages Function
 *
 * Bindings required on the Pages project:
 *   KV namespace binding:  LEDGER          (Settings → Functions → KV namespace bindings)
 *   Secret (env var):      LEDGER_PASSWORD (Settings → Environment variables, encrypted)
 *
 * Routes:
 *   POST /api/load   { password }                  -> { rev, config, ledger }
 *   POST /api/save   { password, rev, config, ledger } -> { rev } | 409 stale
 */

const KEY = "household-ledger-v1";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

/* Length-independent comparison so timing doesn't leak the password. */
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
  config: {
    streams: [],
    bills: [],
    allowances: [],
    cushion: 0,
    periodAnchor: null,
    trackingStart: null,
  },
  ledger: { paychecks: [], draws: [] },
};

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.route || []).join("/");

  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  if (!env.LEDGER) {
    return json({ error: "Storage isn't connected. Add the LEDGER KV binding in Pages settings." }, 500);
  }
  if (!env.LEDGER_PASSWORD) {
    return json({ error: "No password is set. Add LEDGER_PASSWORD in Pages settings." }, 500);
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

  /* ---------------- load ---------------- */
  if (route === "load") {
    const raw = await env.LEDGER.get(KEY);
    if (!raw) return json(EMPTY);
    try {
      return json(JSON.parse(raw));
    } catch (e) {
      return json(EMPTY);
    }
  }

  /* ---------------- save ---------------- */
  if (route === "save") {
    const raw = await env.LEDGER.get(KEY);
    let current = EMPTY;
    if (raw) {
      try { current = JSON.parse(raw); } catch (e) {}
    }

    const incoming = Number(body.rev);
    if (Number.isFinite(incoming) && incoming < current.rev) {
      return json(
        {
          error: "stale",
          message: "Someone else saved a change first. Reload to pick it up, then redo your edit.",
          rev: current.rev,
          config: current.config,
          ledger: current.ledger,
        },
        409
      );
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
