const KEY = "household-ledger-v1";

const EMPTY = {
  rev: 0,
  config: {
    streams: [],
    bills: [],
    allowances: [],
    cushion: 0,
    periodAnchor: null,
    trackingStart: null
  },
  ledger: { paychecks: [], draws: [] }
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export async function onRequest({ request, env, params }) {
  if (!env.LEDGER) {
    return json({ error: "LEDGER KV binding is missing." }, 500);
  }

  const route = params.route;

  if (request.method === "GET") {
    return json({ ok: true, route, storageConnected: true });
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  if (route === "load") {
    const raw = await env.LEDGER.get(KEY);

    if (!raw) return json(EMPTY);

    try {
      return json(JSON.parse(raw));
    } catch {
      return json(EMPTY);
    }
  }

  if (route === "save") {
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Couldn't read request." }, 400);
    }

    const raw = await env.LEDGER.get(KEY);
    let current = EMPTY;

    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {}
    }

    const incoming = Number(body.rev);

    if (
      Number.isFinite(incoming) &&
      incoming < Number(current.rev || 0)
    ) {
      return json({
        error: "stale",
        message: "Someone else saved first. Reload and try again.",
        rev: current.rev,
        config: current.config,
        ledger: current.ledger
      }, 409);
    }

    const next = {
      rev: Number(current.rev || 0) + 1,
      config: body.config ?? current.config,
      ledger: body.ledger ?? current.ledger,
      savedAt: new Date().toISOString()
    };

    await env.LEDGER.put(KEY, JSON.stringify(next));

    return json({ rev: next.rev });
  }

  return json({ error: "Unknown route." }, 404);
}
