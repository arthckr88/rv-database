# RV Database

Three lookups on one site: Nationwide, Frontier, and Santa Monica. Each one has paid RV parks and free public land.

1. **Paid parks** — Southern California RV parks ranked on quality versus price, long-term and monthly first. Distance is the drive to Santa Monica Pier.
2. **Public land** — free and near-free legal camping on public land in the United States and Canada. Mexico is out of scope.

The same shell holds both. The rig toggle is always in the header: **Class C** (you live in the rig) or **Trailer + Tesla** (drop the trailer, unhitch, drive the car).

This is a planning tool. It is not a reservation, a permit, or a promise that a site is open. **Posted signs, a forest motor-vehicle map, and the provincial atlas beat this website.**

Last checked September 2026.

## Live site

- Live: https://arthckr88.github.io/rv-database/
- Repo: https://github.com/arthckr88/rv-database

A push to `main` rebuilds that site from `dist/`. Every Monday at 16:00 UTC, `.github/workflows/verify-parks.yml` fetches official park pages, and if `parks.json` or `verifyLog.json` changed it commits `chore: weekly park rate verify` and publishes the new JSON. The same publish runs on any other push to `main`. Vercel is not used.

```bash
npm ci
npm run build
```

There is no backend, no login, and no Google Maps key. The basemap is Esri’s dark gray canvas. Public-land overlays are live BLM and PAD-US services. If one of those services fails, the tab stays up and says so.

## Paid parks

Parks live in `src/data/parks.json`. Scores are computed in `src/lib/scoring.js` when the page loads, so the formula and the table cannot drift apart.

**Quality (0–10)** — reviews 25%, amenities 20%, noise 15%, security 15%, usefulness to Santa Monica 15%, wifi 10%.

**Price** — a published monthly is used only when the stay is month-to-month or at least 28 nights. A range uses its midpoint. Otherwise the row is `nightlyFrom × 30` and marked estimated. A monthly is never invented.

**Rank** — `0.40×quality + 0.30×price + 0.15×fit + 0.15×proximity`

## Check the rates

```bash
npm run verify:parks
```

That fetches each park’s official page (15 second timeout, desktop user-agent), saves the HTML in `.cache/verify/{id}.html`, and compares it with `src/data/parks.json`. There is no model in this pipeline. The script does not call OpenAI, Grok, or ChatGPT, and it does not read Campendium, iOverlander, AllStays, Google, or Yelp.

A money or rule field is `{ value, sourceUrl, lastVerified, confidence, sourceNote }`. `lastVerified` moves to today only when that park’s parser is confident. If the parse is weak, the old number stays and the row says **Old rate — call the park**. If the host returns 403 or 404, the script tries one other official URL. If that page will not open either, the row says **Rate page wouldn't load** and the old number stays. A page that will not open does not invent a rate. The check log still records `stale` or `blocked`.

Each run appends to `src/data/verifyLog.json` (`ok`, `changed`, `failed`, `stale`, or `blocked`). The process exits 0 unless it crashes. Public land is not part of this check.

### Monday job

GitHub Actions runs `.github/workflows/verify-parks.yml` every Monday at 16:00 UTC, and on demand (`workflow_dispatch`). The job checks out `main`, uses Node LTS, runs `npm ci` and `npm run verify:parks`, and if `parks.json` or `verifyLog.json` changed it commits `chore: weekly park rate verify` and pushes to `main`. That same job publishes the site, because a token push does not start a second workflow. Any other push to `main` is published by `.github/workflows/deploy.yml`. The verify workflow has `contents: write`.

A page that will not open, or a page the parser cannot read, keeps the old number. The row tells the viewer to call the park. The job does not invent a rate.

Rings are miles from the pier: 0–20, 20–45, 45–80, 80–140.

### Add a park

1. Copy an object in `src/data/parks.json`.
2. Set coordinates, drive miles, off-peak and peak minutes to Santa Monica Pier, and a ring.
3. Leave `monthlyFrom` null unless the park publishes a monthly. Explain gaps in `watchOuts`.
4. Set `confidence` to `high`, `medium`, or `low`, add `sources`, and set `lastVerified`.
5. Reload. Do not hand-edit score fields; the page computes them.

## Public land

Read the teach panel on the tab before trusting a pin.

- **BLM** — dispersed camping is often legal on western public land unless posted closed. A typical stay is 14 days in 28, then move. It is recreation, not a home.
- **National Forest** — camp along roads the MVUM marks open.
- **National Parks** — usually not free dispersed camping. Joshua Tree, Death Valley, and Lake Mead are in the list so they are not mistaken for boondocking.
- **LTVAs** — Long Term Visitor Areas around Quartzsite and Yuma. The BLM fee season (Sep 15–Apr 15) is about $180 for the season, $80 for four weeks, $40 for two weeks. They are not $0.
- **Canada** — provincial and territorial. There is no national Crown-land blob on this map. Pick a province and open the official atlas. Ontario non-residents need a camping permit.

`src/data/featuredAreas.json` is a curated set of named areas (not a nationwide shapefile). `src/data/hubs.json` is resupply towns. `src/data/seasons.json` drives the month slider: July warns on desert heat, January dims the high Sierra, Rockies, and Cascades. Trailer + Tesla hides `4x4` and soft-sand areas.

Click the map to ask BLM and PAD-US who manages that point. The answer is a manager. If the query fails, the page says unknown.

### Add a hub or an area

1. Add the town to `src/data/hubs.json` (`dump`, `water`, `grocery`, `propane`, `teslaSupercharger` as `yes`, `no`, or `confirm`).
2. Add the area to `src/data/featuredAreas.json` with `agency`, `cost` (`free`, `low-permit`, `ltva`, or `varies`), `stayLimit`, months, `hazards`, `access`, `fitClassC`, `fitTrailerTesla`, `nearestHub`, `officialUrl`, and `confidence`.
3. Do not add Mexico. Do not mark an LTVA as free. Do not describe a national park as free dispersed camping.

Rules copy for the teach panel is `src/data/usRules.json`. Province links are `src/data/canadaRules.json`.

## Stack

Vite, vanilla JavaScript, Leaflet, Chart.js. Fraunces and Outfit. No Tailwind.
