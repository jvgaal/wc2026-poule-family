# Van Gaal's Worldcup — Family Poule Setup

This is the family-only copy of the WC 2026 poule. It uses simple
name + nickname + shared family password (no SSO).

---

## What I already did for you

- Duplicated the project into `worldcup-2026-poule-family/`.
- Removed the Sam Media logo and SSO sign-in.
- Added the Van Gaal photo in two sizes (`assets/vangaal-logo.png`, `assets/vangaal-header.png`).
- Replaced the login modal with **Name + Nickname + Family password + Colour**.
- Set the family password in `app.js` to **`vangaal2026`** (change it if you want — see below).
- Wired up score mirroring on **both** apps so admin entries on either site
  also POST to the other backend. Once both URLs are filled in, you only
  enter scores once.

---

## What you still need to do (≈ 15 minutes)

### Step 1 — Create the family Google Sheet (2 min)

1. Open https://sheets.google.com → click **Blank**.
2. Rename it **Van Gaal's Worldcup**.
3. Copy the **Spreadsheet ID** out of the URL — it's the long string between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

### Step 2 — Add the Apps Script backend (5 min)

1. In the new sheet: **Extensions → Apps Script**.
2. Delete the empty `function myFunction()` placeholder.
3. Open `Code.gs` from this folder and paste the **entire** contents into the Apps Script editor.
4. At the very top of `Code.gs`, find:
   ```js
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   const ADMIN_PW       = 'worldcup2026';
   ```
   - Replace `YOUR_SPREADSHEET_ID_HERE` with the ID from Step 1.
   - **Important:** keep `ADMIN_PW` the **same** as in the Sam Media `Code.gs`
     (so admin writes from one site can authenticate on the other).
     If you want to change it, change it in **both** Code.gs files.
5. In the Apps Script toolbar: function dropdown → pick **`setupSheets`** → click ▶ **Run**.
   - Approve the Google permission prompt.
   - Four tabs (`Users`, `Predictions`, `Results`, `Config`) should appear in the spreadsheet.
6. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then **copy the Web app URL** (`https://script.google.com/macros/s/.../exec`).

### Step 3 — Paste the URL into both `app.js` files (1 min)

In **`worldcup-2026-poule-family/app.js`** (top of file):
```js
BACKEND_URL: 'YOUR_FAMILY_APPS_SCRIPT_URL_HERE',   // ← paste here
```

In **`worldcup-2026-poule/app.js`** (top of file):
```js
MIRROR_BACKEND_URL: 'YOUR_FAMILY_APPS_SCRIPT_URL_HERE',   // ← paste the SAME URL here
```

That's the score-sync wiring done. (The family `MIRROR_BACKEND_URL` is
already set to your Sam Media Apps Script URL.)

### Step 4 — Change the family password (optional, 30 sec)

Edit `worldcup-2026-poule-family/app.js`:
```js
FAMILY_PASSWORD: 'vangaal2026',   // change to whatever you want
```
This is the password your family types on the login screen. It's a soft
gate — anyone with the link + password gets in, no per-user accounts.

### Step 5 — Deploy to Cloudflare Pages (5 min)

Two easy options:

**A — Drag & drop**
1. Go to https://pages.cloudflare.com → **Create a project → Upload assets**.
2. Drag the `worldcup-2026-poule-family/` folder in.
3. Project name: `vangaals-wc2026` → Cloudflare gives you `https://vangaals-wc2026.pages.dev`.

**B — Via GitHub** (if you want auto-deploy on edits)
```bash
cd "Desktop/Claude Pro Projects/worldcup-2026-poule-family"
git init && git add . && git commit -m "Van Gaals Worldcup family poule"
# create a new private repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/vangaals-wc2026.git
git push -u origin main
```
Then in Cloudflare Pages → **Connect to Git** → pick the repo → no build command, root `/`.

### Step 6 — Re-deploy the Sam Media site (1 min)

Because you just pasted the family URL into `worldcup-2026-poule/app.js`,
that site needs a fresh deploy too — push the change or re-upload the folder
to its existing Cloudflare Pages project.

---

## How the score sync works

When you (as admin) save match results or lock a round on **either** site:
1. The site posts to its own backend (primary).
2. It also fires a fire-and-forget POST to the **other** backend (mirror).
3. Both sheets end up with the same `Results` and `Config` rows.

User predictions are **not** mirrored — those stay on the site each user signed in to.

If a mirror call ever fails (network blip), the primary save still succeeded
and the leaderboard on that site is correct. To resync the other site, just
re-save the affected match — both writes go out again.

---

## Quick test before tournament

1. Open the family site → log in with name "Test", nickname "Tester", password `vangaal2026`.
2. Click ⚽ Predictions, fill in a few group-stage scores → leaderboard should update.
3. Open the Sam Media site as admin → enter a fake match result → check the family Google Sheet `Results` tab — that match's row should appear there too (mirror worked).
4. Delete the fake result before the tournament starts.

---

## Folder map

```
worldcup-2026-poule/         ← Sam Media (work) — SSO sign-in, unchanged behaviour
worldcup-2026-poule-family/  ← Family — name/nickname/password sign-in, Van Gaal branding
```

Both deploy as static sites; only the Apps Script URLs and login logic differ.
