# Household Ledger — Cloudflare Workers setup

Your repo needs exactly this structure:

```
wrangler.jsonc
src/index.js
public/index.html
```

Delete the old `functions/` folder — that was Pages format and a Worker ignores it.

---

## 1. Get your KV namespace ID

In the Cloudflare dashboard: **Storage & Databases** → **KV**. You already made a
namespace in step 4. Next to its name there's an **ID** — a long string of letters and
numbers. Copy it. (If you haven't made one yet, click **Create instance**, name it
`household-ledger`, then copy the ID.)

## 2. Paste the ID into wrangler.jsonc

Open `wrangler.jsonc` and replace `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with the ID you
just copied. Keep the quotes around it.

**This is the part that differs from Pages.** With a Git-connected Worker, bindings
come from `wrangler.jsonc`, not the dashboard. If you add a KV binding through the
dashboard UI, the next deployment overwrites it. The file is the source of truth.

## 3. Push all three files to your repo

`wrangler.jsonc` and `src/index.js` and `public/index.html`, in that structure.
Remove `functions/` and the old top-level `index.html` if they're still there.

## 4. Set the password as a Secret

Dashboard → **Compute (Workers & Pages)** → **toon-budget** → **Settings** →
**Variables and Secrets** → **Add**.

- Type: **Secret** (not plain text)
- Name: `LEDGER_PASSWORD` — exactly this, all caps
- Value: your shared password

Secrets stay out of `wrangler.jsonc` deliberately, because that file is in git.
Anything you put in the file is readable by anyone with repo access.

## 5. Deploy

If the Worker is connected to your GitHub repo, pushing in step 3 already triggered
a build — check the **Deployments** tab. If it says "Manually deployed" and isn't
building on push, go to **Settings** → **Build** and connect the repo.

After the deploy finishes you'll get a `toon-budget.austandardscience.workers.dev`
URL. That's your app.

## 6. Open it and set up

Enter your password. Go to **Bills & pay** → **Load my bills**. Add your three
paychecks. Check the **Year** tab to confirm paydays land correctly.

---

## Put it on your phone

- **iPhone (Safari):** Share icon → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Add to Home screen*

The password saves per device, so you enter it once each.

---

## If something doesn't work

**"Storage isn't connected"** — the KV namespace ID in `wrangler.jsonc` is wrong,
still says PASTE_YOUR..., or you haven't redeployed since fixing it.

**"No password is set"** — `LEDGER_PASSWORD` secret is missing or was added after
the last deploy. Add it, then redeploy.

**"That password doesn't match"** — usually a trailing space in the secret value.

**You get the app's HTML back instead of data** — the Worker isn't intercepting
`/api/`. Check that `main` in `wrangler.jsonc` points at `src/index.js` and that
the deploy actually picked up the new file.

**Blank page** — `public/index.html` isn't where the `assets.directory` setting says
it is. It must be inside `public/`.

---

## Backing up

All data sits in one KV key: `household-ledger-v1`. Dashboard → **KV** → your
namespace → click the key → copy the JSON somewhere safe. Worth doing once a quarter.
