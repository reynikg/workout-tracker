# Workout Tracker

A clean, mobile-first web app for logging gym/home workouts and seeing your progress.
Pure HTML, CSS and JavaScript — no build step, no server, no accounts.

- Calendar view of every workout day
- Add workouts fast: date, workout-type tags (Chest, Back, Core…), exercise suggestions ordered by those tags,
  sets × reps (or seconds for holds like planks) and weight
- Game-style stats: total reps crushed, best streak, leaderboards for most reps and most-trained exercises (with a time-window filter), records, and a consistency chart
- Bodyweight tracker: log your weight per day and see the trend graph
- Your data is stored **only in your browser** (localStorage) — nothing is uploaded
- Import / export backups as a `.json` file
- Your January–June 2026 log is bundled and loadable with one tap
- **Installable PWA**: add it to your home screen and it opens full-screen and works offline

---

## 1. Run it locally

The app needs to be served over `http://` (not opened as a `file://...` path), because the
"Import 2026 workouts" button loads a file and browsers block that on `file://`.

Open a terminal in this folder and run **one** of these:

**Python (already on macOS):**
```bash
python3 -m http.server 8000
```

**Node:**
```bash
npx serve .
```

Then open the address it prints — for Python that's <http://localhost:8000>.

To load your 2026 data: open the app → tap the **gear icon** (top right) → **Settings** →
**Import 2026 workouts**.

### Try it on your phone (same Wi-Fi)
While the server is running, find your computer's local IP (macOS: System Settings → Wi-Fi →
Details, or run `ipconfig getifaddr en0`). On your phone's browser go to
`http://YOUR-IP:8000`. Note: data added on your phone and data added on your computer are
stored separately (localStorage is per-device).

---

## 2. How privacy works

- **Everything you add in the app stays on the device that added it.** It lives in that
  browser's localStorage. It is never sent anywhere and is **never** part of the GitHub repo.
- The only file with workout data in the repo is `data/workouts-2026.json` (your Jan–Jun 2026
  log, used by the "Import 2026 workouts" button). **If you push it to a public GitHub repo,
  that one file is publicly viewable.** You have two options:

  **A. Keep it (simplest).** The import button works instantly on any device. Trade-off: those
  six months of data are public.

  **B. Keep that file private too.** Don't commit it. Add this line to a `.gitignore` file in
  this folder:
  ```
  data/workouts-2026.json
  ```
  The app still works; you just load that data once per device using **Settings → Import
  backup / data file** and picking the `workouts-2026.json` file from your phone or computer.

Either way, **all future workouts you log are private** and never leave your device.

> Tip: clearing your browser history/site data can erase localStorage. Use **Settings →
> Export backup** every so often to save a `.json` you can re-import.

---

## 3. Host it on GitHub Pages (free)

On the free GitHub plan, Pages serves from a **public** repo. The app code being public is
fine — your logged workouts are not in the code (see privacy above).

1. Create a new repository on GitHub, e.g. `workout-tracker`, and push these files:
   ```bash
   cd workout-tracker
   git add .
   git commit -m "Workout tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/workout-tracker.git
   git push -u origin main
   ```
   (This repo is already a git repository, so you can skip `git init`.)

2. On GitHub: **Settings → Pages → Build and deployment**. Set **Source** to
   *Deploy from a branch*, **Branch** = `main`, folder = `/ (root)`, then **Save**.

3. After a minute your app is live at:
   `https://YOUR-USERNAME.github.io/workout-tracker/`

4. Open that URL on your phone and install it (see next section).

5. First time on the hosted site, load your history: gear icon → Settings →
   **Import 2026 workouts** (option A above), or **Import backup** with your json (option B).

That's it — open the app, tap **Add**, and your workout is saved on your phone.

---

## 4. Install it as an app (offline)

This is a Progressive Web App. Once installed it opens full-screen (no browser bars) and
keeps working with no internet connection — the app and your data are cached on the device.
It must be served over `https://` (GitHub Pages) or `http://localhost` for install to be
offered; it won't work from a `file://` path.

- **iPhone / iPad (Safari):** open the site → tap **Share** → **Add to Home Screen**.
- **Android (Chrome):** open the site → open the app's **gear → Settings → Install**, or use
  Chrome's ⋮ menu → **Install app / Add to Home screen**.
- **Desktop (Chrome/Edge):** an **Install** button appears in Settings, or use the install
  icon in the address bar.

After installing, launch it from your home screen like any app. Your workouts (and the cached
app) stay on that device; data still never leaves it.

### Updating an installed app

Installed copies update in place — no need to delete and re-add the home-screen shortcut
(on iPhone, deleting it also deletes the workouts stored in it). In the app:
**Settings → App version → Check for update**. When a newer version is on the server the
app offers to export a backup, then **Update now** swaps to the new version and reloads.
The app also checks quietly on launch and shows a red dot on the gear when an update is out.
If the user never taps Update now, the new version takes over the next time the app is fully
closed and reopened.

**Releasing an update:** bump the version in all three places, then push:
- `APP_VERSION` in `app.js`
- `CACHE` in `sw.js` (e.g. `wt-cache-1.8.1`) — this is what makes phones download the new files
- `version.json` — what "Check for update" compares against

---

## File overview

```
index.html               app shell (tab bar, pages)
styles.css               styling (light + dark, mobile-first)
app.js                   all logic: storage, calendar, stats, charts, add/edit, import/export
legal.js                 privacy policy, terms of use, health disclaimer (single source)
legal.html               public pages for the above (?doc=privacy|terms|health)
manifest.webmanifest     PWA metadata (name, icons, colors) for installing to home screen
sw.js                    service worker — offline caching of the app + data
icons/                   app icons (home screen, favicon, maskable)
data/workouts-2026.json  your Jan–Jun 2026 log (importable sample data)
```

## Legal documents

The Privacy Policy, Terms of Use and Health Disclaimer live in `legal.js` (one source of
truth) and are shown two ways:

- **In the app**: Settings → About & legal.
- **As public URLs**, which the App Store requires at submission time:
  - `https://YOUR-USERNAME.github.io/workout-tracker/legal.html?doc=privacy`
  - `https://YOUR-USERNAME.github.io/workout-tracker/legal.html?doc=terms`
  - `https://YOUR-USERNAME.github.io/workout-tracker/legal.html?doc=health`

Before publishing, edit the constants at the top of `legal.js`: `LEGAL_CONTACT` (support
email), `LEGAL_UPDATED` (date) and `LEGAL_APP_NAME`.

These documents describe the app as it behaves today: no accounts, no analytics, no data
leaving the device. **If you later add sync, accounts, cloud backup, Apple Health access or
any analytics, the Privacy Policy must be updated to match** — Apple checks that the policy
matches the app's actual data use and the privacy labels you declare.

They are a good-faith starting point written for this specific app, not legal advice. Have
them reviewed by a qualified lawyer before you publish commercially.

## Notes on your data

I parsed your notes-app log into structured entries. A few small clean-ups were applied:
- A date written `13/03/2025` was treated as `13/03/2026`.
- Three entries logged as `01/03`, `03/03`, `07/03` but sitting between 31 March and 14 April
  were read as `01/04`, `03/04`, `07/04`.
- One empty day (04/02) with no exercises was skipped.
- `Chest press 2` was normalised to `Chest press-2` (the second machine), and `(D)` is kept to
  mean dumbbell.

Weights are stored exactly as you wrote them ("4 plates", "52kg", "4 plates + 2kg",
"no weights"). Progression graphs pick the unit you used most for each exercise so plates and
kg don't get mixed on one axis.
