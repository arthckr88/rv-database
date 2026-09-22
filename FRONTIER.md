# Frontier hub bases

A **separate** planner from the nationwide master list at `/`. Do not mix the two datasets, but **do keep both current**. Nationwide is the 50-state weather/price scan. This page is the Frontier airport scan scored on a **forward schedule**.

Park or store an RV within about **45 minutes** of a Frontier airport, Uber to the terminal (never airport parking), fly Go Wild to LAX, come back to the same lot.

Open at [`/frontier.html`](http://127.0.0.1:5173/frontier.html) while `npm run dev` is running.

Default horizon is **spring / 2027**. Today’s table is a snapshot you can click into — it is not the plan.

## Why this exists

Nationwide ranking optimizes weather and bang for the buck. This page still uses season, quality, and price, then **re-weights for last-minute LA**:

- Drive minutes to the Frontier airport (default cap **45 min**)
- LAX nonstop frequency **on the selected horizon** (BUR ends; DTW launches)
- Whether the empty rig can **sit** — keep paying the site, on-site storage, or a cheap storage lot
- Estimated **Uber round-trip** park ↔ airport
- Trip length: gone 2–4 days vs a week vs this is home base

Connecting cities stay in the catalog as Frontier presence. They rank poorly for “I need to be in LA tomorrow.”

## Forward calendar (research as of 20 Sep 2026)

Plan on what is **coming**, because routes end and Frontier keeps announcing 2027 flying.

| When | What |
| --- | --- |
| 10 Sep 2026 | LAS–BOI 4x/week (not an LA hop) |
| 9 Oct 2026 | BNA–TPA |
| **12 Oct 2026** | **LAS–BUR last published fares — treat as ended after this** |
| **20 Nov 2026** | **DTW–LAX daily (newsroom). AeroRoutes first filed 20–30 Nov only. Fare pages have shown into Jan–Feb 2027. Confirm continuation.** |
| 20 Nov 2026 | DEN–FLL daily; MCI–MCO 4x/week |
| 21 Nov 2026 | ONT–OAK (skip — already in CA) |
| 10–19 Dec 2026 | MCO–Colombia (MDE daily, BOG 6x/wk, CTG weekly). International Go Wild is 10 days, not day-before. Not last-minute LA. |
| 17 Dec 2026 – 4 Jan 2027 | IAH–SJU and LAX–GUA holiday-only. Not a parking plan. |
| 19 Dec 2026 – 2 Jan 2027 | DFW–SJO Saturday holiday-only |
| **6 Mar 2027** | **MCO–BOG goes daily** |

Sep 2026 published LAX banks (they drift): DFW ~34, LAS ~33, DEN ~30, ATL ~24, IAH ~14, PHX ~14, MCO ~13, SLC ~12, SEA ~12, PDX ~6. Skip SFO/SJC/SMF/OAK/ONT. ORD is not on that table.

## The actual logistics

| You are… | Pay for | Rig waits | Get to the airport |
| --- | --- | --- | --- |
| Living there monthly, gone 2–4 days | Occupied monthly (already sunk) | Keep the site if the park allows an empty trailer | Uber round-trip. Not airport parking. |
| Not on a monthly, gone a few days or a week | Storage daily or the facility’s billed minimum | Storage lot / on-site storage | Uber round-trip |
| This is home base | Occupied monthly + extra vehicle for the Tesla | Same site | Short Uber from a fat LAX bank |

If the park will **not** sit an empty trailer, check out and put it in a storage lot. Do not try to hide a 30-foot trailer in an airport garage.

## Circuit

| Season | Live near | Skip living at |
| --- | --- | --- |
| Winter | LAS (cheap occupied + storage), PHX, IAH ($623 / 12 min), DFW, MCO | DEN, SLC, SEA, PDX, ORD, CLE, PHL |
| Spring | LAS, DFW, Houston until humidity, then point the rig at DEN | PHX after May, Florida as it steams |
| Summer | **DEN**, or Clark Fairgrounds $495 if Denver occupied is too rich; SLC/SEA as backups | PHX, inland FL, Gulf, Vegas on the ground |
| Fall | DEN into October, then PHX / LAS. Do not plan LAS–BUR after 12 Oct 2026. | High Rockies after the first freeze |

## Hubs in this build

Country-wide Frontier **market scan** (focus cities + spokes), not a 16-airport starter set. Parks live in `frontier-parks.json` + `frontier-more.json` + `frontier-scan.json`.

**Last-minute LA on a 2027 horizon:** DFW, LAS, DEN, ATL, IAH, PHX, MCO, SLC, SEA, PDX, and **DTW (daily from 20 Nov 2026 — confirm the filing)**.

**Connect / do not park here for last-minute LA unless a 2027 LAX filing appears:** ORD/MDW, PHL, CLE, TPA, MIA, TTN, plus the rest of the spoke map (MCI, BNA, FLL, BOS, …). Two Go Wild day-before seats.

Kent KOA (the old Sea-Tac park) closed in 2021. Do not list it as live.

## Cheap occupied and storage (why $700 is not the floor)

Live-in examples: Forest Park ATL classified ~$382, Desert Sky AJ $399 (55+, ~50 min), Hitchin’ Post / Maycliff Vegas $470–$650, Clark Fairgrounds $495, Gallagher Acres FW $600, Northlake IAH $623, Kissimmee off-season $725, Jantzen Beach PDX $795.

Storage examples: Extra Space Pecos ~$115, RecNation Houston ~$79, Kissimmee outside storage $125, Aspen Aurora ~$135, Sam’s LAS $20/day (14-day min) or ~$360/mo.

## Go Wild (planning, not inventory)

- Domestic: book the **day before** (often midnight local at the departure airport).
- International: 10 days.
- Pass covers the fare. Taxes/fees, bags, and seats are extra.
- Blackouts include Thanksgiving week, Christmas week, and some holiday weekends.
- The pass is not a confirmed seat.

## Rank

`0.18×quality + 0.16×price + 0.10×fit + 0.12×season + 0.16×airport drive + 0.12×LAX + 0.10×sit + 0.06×hub`

Dash/week trips shift a little more weight onto sit. Uber is `base + miles + minutes` × a city multiplier, rounded, not a live quote.

Parks live in `src/data/frontier-parks.json`, `src/data/frontier-more.json`, and `src/data/frontier-scan.json`. Math lives in `src/lib/frontier.js` and `src/lib/frontier-scoring.js`. The nationwide master list is a separate catalog (`parks.json` + `us-parks.json` + `us-market.json`).

## Honesty

- Many KOA monthlies are still “call” and marked medium / estimated.
- Classified lots (Forest Park) can vanish. Call before you point the rig.
- Storage lots often have a monthly or 14-day minimum — a 3-day dash can still bill two weeks.
- Weekly LAX frequencies drift. Confirm on Frontier before you count on a bank.
- Empty-trailer rules are a phone call, not a published API.
