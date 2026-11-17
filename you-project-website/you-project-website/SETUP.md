# Studio Dashboard: setup for a new studio

A clean copy of the studio dashboard built for MOTUM, with MOTUM's name, data, people and branding taken out.
It reads the studio's own Hapana account and runs on **Melbourne (Victoria) time**.

**What's included:** Home (today's classes, who needs attention), Members, Attendance, Milestones, Onboarding,
Team hub (to-dos, team list, calendar), Coach / Admin access, and under **More**: Geronimo reports
(Red / Orange Flag, Fringe List, Hall of Fame, weekly numbers), Sell By Chat, Membership reports (rollovers,
payment issues) and Message templates with emails from the studio inbox.

**Left out on purpose:** MOTUM's Tools (Sales Value Calculator, Member Movement upload, mailing list and class list
exports) and the MOTUM Clinic draft. Geronimo **Results** and **Scoreboard** stay hidden until a Geronimo Metrics
sheet is linked (optional, step 4.4).

**Preview first (optional):** build the website with `VITE_DEMO=1 npx vite build` to click through every page on
made-up sample data, with no Hapana, Sheet or Google sign-in. Never set `VITE_DEMO` on the real Netlify site.
What to ask Hapana for is in **HAPANA_CHECKLIST.md**.

How it fits together:

```
Hapana ──(6am Apps Script refresh)──► Google Sheet ──► Netlify website (the dashboard)
Notes / to-dos / Sell By Chat / emails ──► Netlify ──► Apps Script ──► Google Sheet
```

You need: the MOTUM dashboard Google Sheet (to copy), the new studio's Hapana API details, a Google account for the
studio (ideally its Google Workspace inbox, e.g. hello@…), a GitHub account and a Netlify account. About 1 hour.

---

## 1. Copy the Sheet (keeps the formulas the dashboard needs)

1. Open the MOTUM dashboard Sheet → **File → Make a copy**. Copy it **into the new studio's Google Drive / account**.
   Tick "Copy the bound script" if asked (the Apps Script comes along).
2. Rename the copy, e.g. **The You Project Dashboard**. The name must not contain "MOTUM".
3. In the copy: **Extensions → Apps Script**.

## 2. Replace the Apps Script files

In the `apps-script/` folder of this package there are 12 files. In the copy's Apps Script:

1. Replace the contents of every file that already exists (Code, Dashboard, Api, Tools, Alerts, Team, Calendar,
   SellByChat, Templates, and Index.html).
2. Add two new script files (+ next to Files → Script) named exactly **Studio** and **Reset**, and paste them in.
3. Fill in **Studio.gs** (studio name, inbox, colours, email footer…). The branding step (BRANDING.md) covers it in full.
4. Save.

## 3. Empty out MOTUM's data (once)

1. In **Reset.gs**, put the copy's exact new name into `RESET_CONFIRM`, e.g. `const RESET_CONFIRM = 'The You Project Dashboard';`. Save.
2. Pick **resetForNewStudio** in the function menu → **Run** → approve permissions.
   It empties every data tab (clients, classes, attendance, memberships, notes, to-dos, Sell By Chat, templates…),
   keeps headers and formulas, makes you the first **Admin** on the Access tab, and removes MOTUM's timers.
   It refuses to run on a Sheet whose name still contains "MOTUM".
3. Delete **Reset.gs** afterwards.

## 4. Connect the studio's Hapana

1. **Project Settings (gear) → Script Properties**. Delete anything from MOTUM, then add:
   * `HAPANA_BASE_URL`, `HAPANA_ACCESS_ID`, `HAPANA_SITE_ID`: from the studio's Hapana API access.
2. Run these once each (function menu → Run), approving permissions:
   1. **setupDashboard**: tabs, Access roles, Calendar, Templates (and any signatures in Studio.gs).
   2. **setupSellByChat**: the SellByChat and SBC_Summary tabs.
   3. **refreshClients**, then **refreshPurchases**, then **refreshAll**: the first pull from Hapana (a few minutes each).
   4. **backfillHistory**: fills class and attendance history from 1 January. It keeps going by itself; watch API_Log.
   5. **scheduleAutoRefresh**: the daily 4am / 5am / 6am Hapana refresh.
   6. **setupCheckinAlert**: the 8pm "classes with missing check-ins" email (set who gets it on the Alerts tab).
   7. **checkEmailSetup**: approves Gmail and says whether member emails will come from STUDIO_EMAIL.
3. **Plan_Rules tab:** after refreshPurchases, each membership in Hapana is listed. Fill in the expected visits per
   week for each (used for "short of plan").
4. **Intro_Offers tab:** replace the two example rows with words from the studio's intro offer names and their length in days.
5. Optional: Geronimo Metrics sheet. Paste its link into `METRICS_SHEET_URL` in Studio.gs (read only, never written to)
   and give the script's account view access. Results and Scoreboard then appear under Geronimo.

## 5. The private link between the website and the Sheet

1. Run **makeApiSecret** → copy the code from the execution log.
   **Script Properties** → add `API_SECRET` = that code.
2. Run **makeApiSecret** again → keep this second code for Netlify (`SESSION_SECRET`).
3. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone** → Deploy.
   Copy the Web app URL (ends in `/exec`). "Anyone" is safe: every request must carry the secret.
4. From now on, after changing any Apps Script file: **Deploy → Manage deployments → New version**. Never "New deployment".

## 6. The website (GitHub + Netlify)

1. GitHub → **New repository** (Private), e.g. `you-project-dashboard`. Unzip the website folder first, then upload
   **the files inside it** (not the zip, not the folder itself). Commit.
2. Netlify → **Add new site → Import an existing project → GitHub** → pick the repository → Deploy.
3. Note the site address, e.g. `https://you-project-dashboard.netlify.app`. Put it in `DASHBOARD_URL` in Studio.gs
   (then New version, as in 5.4).
4. Netlify → **Site configuration → Visitor access**: make sure it's **Public** (the dashboard has its own sign-in).

## 7. Google sign-in

1. console.cloud.google.com, signed in as the studio account → new project, e.g. `Studio Dashboard`.
2. **Google Auth Platform → Branding**: app name, support email. **Audience**:
   * Google Workspace studio: **Internal** (only the studio's accounts).
   * Personal Gmail accounts: **External**, and add each person as a test user (or publish the app).
3. **Clients → Create client → Web application**. Authorised JavaScript origins: the Netlify address (no slash at the
   end). Add the preview address too if you use one (`https://preview--…netlify.app`). Copy the **Client ID**.

## 8. Netlify environment variables

Netlify → **Site configuration → Environment variables**:

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from step 7 |
| `APPS_SCRIPT_URL` | the `/exec` URL from step 5.3 |
| `APPS_SCRIPT_SECRET` | the `API_SECRET` code from step 5.1 |
| `SESSION_SECRET` | the second code from step 5.2 |
| `ALLOWED_DOMAINS` | the studio's email domain, e.g. `youproject.com.au` (comma-separated for more). Leave empty to let in only people on the Access tab. |
| `STUDIO_NAME` | e.g. `The You Project` |

Then **Deploys → Trigger deploy → Deploy site**.

## 9. Open it and set roles

1. Open the Netlify address → **Sign in with Google**. The first load takes about a minute.
2. **Access tab** in the Sheet: **Admin** for the owners (e.g. Ange and Nicole) and anyone who should see Geronimo,
   Sell By Chat and templates; **Coach** for coaches; **Blocked** for no access. Anyone from `ALLOWED_DOMAINS` who isn't
   listed gets the Coach view.
3. **More → Message templates**: edit the starter templates, add each person's email signature
   (category *Signature*: name on line 1, title on line 2).

## Day to day

* Hapana data updates every morning; the dashboard picks it up by itself. **Refresh** (top right) pulls it straight away.
* After editing any Apps Script file: **Manage deployments → New version** on the web app deployment.
* Something wrong? Check the **API_Log** tab first.

## Troubleshooting

* **"doesn't have access"**: their email isn't in `ALLOWED_DOMAINS` and isn't on the Access tab, or they're Blocked.
* **"not connected to the Google Sheet"**: `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET` missing or wrong. Redeploy after fixing.
* **Sign-in button missing / "origin not allowed"**: `GOOGLE_CLIENT_ID` missing, or the site address isn't in the authorised JavaScript origins.
* **Hapana HTTP 504**: Hapana timed out. The script retries in smaller pieces; run refreshAll again later if needed.
* **Emails won't send**: run checkEmailSetup and read API_Log. The script must run as STUDIO_EMAIL, or have it as a "Send mail as" address.
