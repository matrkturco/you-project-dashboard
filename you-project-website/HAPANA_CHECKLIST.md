# What The You Project needs from Hapana

The dashboard reads Hapana through Hapana's API (the same way the MOTUM one does). Nothing needs to be exported by
hand. Ask Hapana support (or whoever manages The You Project's Hapana account) for the following.

## 1. API access for The You Project's site

You need three values. They go into the Google Sheet's Apps Script, under **Project Settings → Script Properties**:

| Script Property | What it is | Where it comes from |
|---|---|---|
| `HAPANA_BASE_URL` | The Hapana API address for your region | Hapana support. It's normally the same as MOTUM's, so check MOTUM's Script Properties first. |
| `HAPANA_ACCESS_ID` | The API key (Hapana calls it an "Access ID") | Hapana support issues one per business. **Don't reuse MOTUM's.** |
| `HAPANA_SITE_ID` | The ID of The You Project's site/location | Hapana support, or in Hapana's settings. One per location. |

Suggested message to Hapana support:

> Hi, we'd like API access for The You Project, the same as we have for MOTUM. Could you please send us an
> API Access ID and the Site ID for The You Project's location, and confirm the API base URL? We need read
> access to the endpoints below.

## 2. The API endpoints the key must be allowed to read

Ask Hapana to make sure the key can read all of these (the dashboard only reads, it never writes to Hapana):

* `/v2/site/sessions`: the class timetable
* `/v2/site/sessionDetail`: who's booked into each class
* `/v2/site/packages`: the list of memberships and packs
* `/v2/customer/client`: the client list (names, contact, join date, status, active packages, payment issues)
* `/v2/customer/visitHistory`: check-ins, no-shows and late cancels
* `/v2/customer/client/purchases`: memberships, intro offers and class packs bought

## 3. Things to have ready from inside Hapana (not from support)

* The names of The You Project's **intro offers** and how many days each lasts (for the Intro_Offers tab).
* For each **membership**, how many visits a week it's meant to include (for the Plan_Rules tab, so
  "short of plan" works).

## Not needed

* No CSV exports, no Hapana login for the dashboard, and no changes to Hapana's settings.
