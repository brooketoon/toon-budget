# Household Ledger — Cloudflare Pages setup

Two files matter:

```
index.html
functions/api/[[route]].js
```

Keep that exact folder structure. Cloudflare turns anything under `functions/` into a
server route automatically — `functions/api/[[route]].js` handles `/api/load` and `/api/save`.

---

## 1. Put the files in a GitHub repo

New private repo. Push both files with the structure above. Nothing else needed —
no build step, no package.json, no framework.

## 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.

Pick the repo. When it asks for build settings:

- **Framework preset:** None
- **Build command:** leave blank
- **Build output directory:** `/`

Save and deploy. It'll finish in under a minute and give you a `*.pages.dev` URL.
The app will load but say storage isn't connected — that's expected until step 4.

## 3. Create the KV namespace

**Storage & Databases** → **KV** → **Create instance**.

Name it `household-ledger`. That's the whole step.

## 4. Bind the KV namespace to the project

Back in your Pages project → **Settings** → **Bindings** (or **Functions** → **KV namespace
bindings**, depending on where the dashboard puts it that week) → **Add**.

- **Variable name:** `LEDGER` — must be exactly this, uppercase
- **KV namespace:** the `household-ledger` one you just made

Add it for **Production**. If you also see a Preview environment, add it there too.

## 5. Set the password

Same Settings page → **Environment variables** → **Add variable**.

- **Variable name:** `LEDGER_PASSWORD` — exactly this
- **Value:** your shared password
- Click **Encrypt** before saving, so it's stored as a secret rather than plain text

Add it to **Production**.

## 6. Redeploy

Bindings and variables only take effect on a new deployment. Go to **Deployments** →
find the latest → **Retry deployment**. Or push any commit.

## 7. Open it

Visit the `.pages.dev` URL. Enter the password. Go to **Bills & pay** → **Load my bills**.
Add your three paychecks. Done.

Send the same URL and password to the other person.

---

## Put it on your phone

Open the URL in your phone's browser.

- **iPhone (Safari):** Share icon → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Add to Home screen*

It gets an icon and opens full-screen. The password stays saved on each device, so
you only enter it once.

---

## Things worth knowing

**Simultaneous edits are handled.** Each save carries a revision number. If your
partner saved while you had the page open, your save is rejected and you get a
message telling you to reload — rather than silently overwriting their change.
The app polls every 15 seconds, so in practice you'll rarely hit it.

**The password is the only gate.** Anyone with the URL and the password gets in.
Use something you don't use elsewhere. Turn on 2FA for your Cloudflare account.

**Free tier is plenty.** KV free tier allows 100,000 reads and 1,000 writes a day.
This app writes only when you change something.

**Backing up.** All data lives in one KV key called `household-ledger-v1`. You can
read it straight from the Cloudflare dashboard (KV → your namespace → the key) and
copy the JSON somewhere safe. Worth doing once a quarter.

---

## If something doesn't work

**"Storage isn't connected"** — the `LEDGER` binding is missing or misspelled, or you
haven't redeployed since adding it. Check step 4, then step 6.

**"No password is set"** — `LEDGER_PASSWORD` is missing, or you added it after the
last deploy. Check step 5, then step 6.

**"That password doesn't match"** — trailing space in the Cloudflare variable is the
usual culprit. Re-enter it.

**Page loads but nothing saves** — open the browser console and check `/api/save`.
A 500 usually means the binding is attached to Preview but not Production.
