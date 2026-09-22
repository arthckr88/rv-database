# Audit — Where the rig sleeps

Audited 21 Sep 2026 against the running app at `http://127.0.0.1:5173` (desktop 1280px and 390px) and against the files below. Dollar amounts were checked against this repo and the UI. They were not re-fetched from park websites, so a rate can match the file and still be stale in the world.

## 1. Verdict

Ship with fixes. This is already one Vite app, two tabs, a real park list, and a real BLM overlay. It is not trustworthy as a place-to-live ranking until Newport Dunes stops scoring like a bargain, stay caps that exist only in prose start affecting rank, and far parks stop sitting next to Valley monthlies.

## 2. What already works

File tree that matters (junk and `node_modules` omitted):

```
index.html
package.json
vite.config.js
README.md
FRONTIER.md
scripts/emit-market.mjs
src/main.js
src/paid.js
src/public.js
src/styles.css
src/frontier-main.js
src/frontier.css
src/lib/basemap.js
src/lib/format.js
src/lib/geo.js
src/lib/scope.js
src/lib/scoring.js
src/lib/seasons.js
src/lib/frontier.js
src/lib/frontier-scoring.js
src/data/parks.json
src/data/featuredAreas.json
src/data/hubs.json
src/data/seasons.json
src/data/usRules.json
src/data/canadaRules.json
src/data/frontier-parks.json
src/data/frontier-more.json
src/data/frontier-scan.json
src/data/us-market.json
src/data/us-parks.json
```

- Entry is `index.html` → `src/main.js`. Tabs are buttons, not a router. `#parks` and `#land` toggle two panels in one shell. One `package.json`, one `npm run dev`.
- Map library is Leaflet 1.9.4. Scatter is Chart.js.
- Basemap: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}` plus the Reference label layer. Attribution “Tiles © Esri — Esri, DeLorme, NAVTEQ” was visible on both maps.
- Public-land services in `src/public.js`:
  - `https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_BLM_Only/MapServer`
  - `https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_with_PriUnk/MapServer`
  - `https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recs_poly/MapServer`
  - `https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer`
  - OSM hints, off by default: `https://overpass-api.de/api/interpreter`
- BLM surface tiles actually loaded (256px images from `gis.blm.gov`, probe HTTP 200). This is not a painted yellow box. CARTO and “API KEY REQUIRED” are absent.
- Paid tab: 23 parks in `src/data/parks.json`. UI scores match `src/lib/scoring.js` (Walnut Class C rank 8.2, Trailer 8.3, monthly `$1,650`). Rings 0–20 / 20–45 / 45–80 / 80–140 are on the map and in the filter. Pier anchor in `src/lib/format.js` is `34.01, -118.4963`.
- Rig toggle is in the header on both tabs. Class C vs Trailer + Tesla changes the paid rank and, on public land, hides 4x4 and soft sand (January in-season list went from 26 areas to 21, label “4x4 and soft sand hidden”).
- Short list on the paid tab has the four named picks. Long-stay filter cut the table from 23 to 14 and dropped Dockweiler, Malibu, Bolsa Chica, Rincon, Emma Wood, and the other hard caps. Scatter click opened Newport Dunes. Drawer shows hookups, stay, extra vehicle, noise, watch-outs, confidence, sources, `lastVerified`.
- At 390px the page itself does not scroll sideways. The park table scrolls inside `.table-scroll` (content 760px, viewport 368px). Short-list cards scroll sideways (996px in a 370px row).
- Public land: primer from `src/data/usRules.json` covers BLM, MVUM, NPS, LTVAs at about `$180 / $80 / $40`, “almost no trailer-friendly free BLM next to Santa Monica,” and “yellow land is not a campsite.” 58 featured areas, all with `officialUrl`, `confidence`, `stayLimit`, and `access`. LTVAs say permit, not `$0`. NPS cards say they are not free dispersed camping. Canada is a province picker plus official atlas links, not a national polygon. Mexico is rejected in copy and in `src/lib/scope.js`. A map click on the British Columbia view returned Tongass / Alaska Maritime and the line “This names a manager. It does not say you can camp here.”
- July slider copy: “Desert heat warning… Imperial, Blythe, Quartzsite, and Yuma.” January copy tells you to drop the high Sierra, Rockies, and Cascades. “In season this month” then shows 12 mountain/Canada areas in July and 26 desert areas in January.
- All 24 named hubs are in `src/data/hubs.json`. Dump, water, grocery, propane, and Supercharger are separate fields. Parker and Ehrenberg are `teslaSupercharger: "no"`. Ridgecrest and Burns are `unconfirmed` and the popup says “confirm.”
- README covers both tabs and says rates and rules go stale.
- Grep: no CARTO, no API key, no TODO/TBD, no lorem, no iOverlander, no AllStays. `frontier.html` does not exist. Vite’s fallback serves `index.html` at that URL, so it is not a second app. Campendium appears once, as a Malibu source URL in `src/data/parks.json`, not as a scraper.

## 3. Must-fix before trust

1. `src/data/parks.json` (`newport-dunes`) and `src/lib/scoring.js` (`effectiveMonthly`, `priceScore`). Rank, scatter, and value index use `monthlyFrom` `$1,207`. The same record’s note says summer roughly doubles and the watch-out says summer monthly `$2.1k–$4.5k`. In the UI Newport is the #2 Class C long-stay park (rank 8.1, price score 8.0, value index 6.6) and the clicked scatter dot sits at `$1,207` / quality 8.0. Done: the rank and the dot use a number that represents what a long stay actually costs (summer, or the high end of the published range), and Newport is not a top long-term value pick.

2. `src/data/parks.json` (`golden-shore`) and `src/lib/scoring.js` (`isLongTerm`, `priceScore`). The watch-out says “Summer 14-night cap.” `maxStayNights` is null, so the stay column says “Open-ended” and Golden Shore stays inside the 14-park long-stay list. Same pattern on Walnut and Ventura Oaks: `maxStayWindowDays` is 180, the Stay field still says “Open-ended,” and the six-month approval is only a sentence under the facts. Done: a cap that the file already knows about changes the stay column and the long-term rank.

3. `src/data/parks.json` (`ramona-oaks`, `pismo-coast-village`) and the rank sort in `src/paid.js`. Ramona is 130 miles / 140 minutes and still rank 8.0, fourth in the Class C long-stay table, beside Pacific RV Park. Pismo is 175 miles and is filed in ring `80-140`, so the pin color claims it is inside the outer ring. Done: anything past a daily Santa Monica commute is labeled far value and cannot outrank a real monthly base on cheap rent alone. Pismo’s ring matches its miles or it leaves the ring set.

4. `src/data/parks.json` (`walnut`, `dockweiler`, `hollywood-rv`, `valencia-travel-village`) and `src/paid.js` (the Stay and Monthly columns). Walnut shows `$1,650` and “Month-to-month up to 6 months after approval,” and never mentions a `$200` electric deposit. The Stay row says “Open-ended.” Dockweiler has `$65–$75`, 21 nights / 60 days, 40 ft, LAX noise, and no monthly, and never says dry camping is cheaper. Hollywood’s table row is `$1,500–$1,600` “published”; the note admits the `$1,600` end is an older aggregator split, and the row does not say call. Valencia’s weekly field is only `$539` (no `$574`) and the table shows `$1,870 est.` from nightly × 22 while the note says the park does not publish a monthly. Done: the deposit and the dry rate are in the drawer or explicitly marked unknown; Hollywood’s non-first-party end says confirm/call; Valencia’s monthly cell says contact, not a planning monthly.

5. `src/paid.js` drive columns and `src/data/parks.json`. Off-peak and peak minutes are printed as facts (`35 min · peak 65 · 22 mi`) with no source and no “estimate” label. Done: those minutes are labeled estimates, with whatever source produced them.

6. `src/data/featuredAreas.json`. Angeles National Forest, Los Padres Pine Mountain, and Holcomb Valley all use `nearestHub: "barstow"`. Mule Mountain’s `officialUrl` is the Midland LTVA page. Alberta Eastern Slopes has `nearestHub: null` and the card says “No listed hub,” which is at least honest. Done: each pin’s hub is a town you would actually resupply from, and each official URL is that unit’s page.

7. `src/public.js` and `index.html`. There is no short-list row for winter desert trailer, summer mountain trailer, closest belt to LA, LTVAs, or Canada starter. Those ideas exist only as a filter dropdown and the teach cards. The month slider’s default list stays 58 areas; July adds a “heat warning” class and January dims high country. Rows leave the list only after “In season this month.” Done: the five short lists are on the page, and January drops the high Sierra / Rockies / Cascades from the list the user is looking at without an extra filter.

8. `src/paid.js` `renderShortlist`. Every card’s “Rank” number uses the rig that is currently selected. With Class C on, the “Best Trailer + Tesla” card still said Rank 8.2. Done: each card shows the rank for the rig named in its title.

9. `index.html` footer. It says color is not a campsite and that posted signs beat the site. It does not say this is not permission, that the field office wins, or that this is not a place to live. The “not a home” sentence is only inside the BLM teach card. Done: the footer says all three.

## 4. Data honesty checklist

### Paid parks

- [x] Pass. Persistent nav is Paid parks + Public land (`index.html`, `src/main.js`). There is no `frontier.html`. `/frontier.html` falls through to this same page. `FRONTIER.md` still tells you to open that URL.
- [x] Pass. Santa Monica Pier is `34.01, -118.4963` in `src/lib/format.js`, drawn on both maps.
- [ ] Fail. Drive miles and off-peak/peak minutes exist on every park and show in the table and drawer. They are printed as exact minutes. Nothing in the JSON says they are estimates.
- [ ] Fail. The four rings exist and the other 22 parks’ `driveMilesToSantaMonica` fall in the ring stored on the record. Pismo Coast Village is 175 miles and `ring` is `80-140`, so the pin color does not match the circle.
- [x] Pass. 23 named parks in `src/data/parks.json`, not stubs. UI count was “23 of 23,” then “14 of 23” with Long stay only.
- [ ] Fail. Walnut, 19130 Nordhoff St, Northridge, monthly `$1,650`, high confidence, sources on walnutrvpark.com, “Month-to-month up to 6 months after approval” in the drawer note. The `$200` electric deposit is not in the file. The Stay field says “Open-ended,” not the six-month approval. Live site not re-checked.
- [ ] Fail. Dockweiler nightly `$65–$75`, stay 21 / 60, max 40 ft, LAX noise, no monthly, trailer fit 0. Dry camping cheaper is absent.
- [x] Pass. Malibu nightly `$85–$270`, monthly `$1,984–$5,568`, 28-night cap, watch-out says the monthly is still `$2k–$5k`. It is the beach short-stay pick, not the long-term pick. The scatter still plots the `$1,984` floor.
- [ ] Fail. Hollywood, 7740 Balboa Blvd, Van Nuys, is in the file at `$1,500–$1,600`, confidence medium. The table marks that range “published.” The note says the `$1,600` / `$1,400` split is an older aggregator. The row does not say call.
- [ ] Fail. Valencia daily `$85–$105` matches. Weekly is only `$539` (`weeklyTo` is null), so `$574` never appears. Monthly is null in the JSON and the note says contact, but the table shows `$1,870 est.`
- [ ] Fail. Newport Dunes exists (1131 Back Bay Dr, monthly `$1,207–$2,536`, watch-out `$2.1k–$4.5k` summer). It is ranked as strong long-term value. See must-fix 1.
- [x] Pass. Rincon Parkway and Emma Wood have no hookups, no water, no sewer, risky leave-trailer, and they fall out of Long stay only. Emma Wood’s watch-out still says closed “through at least June 2026” on a record verified `2026-09`.
- [x] Pass. Golden Shore RV Resort, Ventura Beach RV Resort, and Evergreen RV Park (Oxnard) are all in `src/data/parks.json` and in the table.
- [ ] Fail. Ramona Oaks is `$800`, 130 miles, and the watch-out says it is not a daily commute. The Class C long-stay sort still places it fourth at rank 8.0.
- [x] Pass. A null `monthlyFrom` becomes nightly × 22 and the table says “est.” / “nightly × 22.” Valencia, Golden Shore, Canyon, and Fairplex follow that. Golden Village Palms keeps a null monthly. The drawer still repeats third-party monthly figures (`$695–$895` at Golden Village, `$1,320` at Fairplex in 2025) and labels them as not the posted card.
- [ ] Fail. Numeric caps of 7–30 nights do knock parks out of the long-term short list and cut the price score. Golden Shore’s summer 14-night cap does not, because it is only prose.
- [x] Pass. Trailer fit is a different function (`fitScoreTrailer` vs `fitScoreClassC`) and uses extra vehicle, unhitch, and leave-trailer. Dockweiler is fit 5.5 Class C and fit 0 Trailer. The table rank changes with the rig toggle.
- [x] Pass. Class C fit penalizes a park whose published max length is under 30 ft. It does not require a 45 ft pusher. Several parks, including Walnut, have `maxRvLengthFt: null`, so length is “Not published” and unscored.
- [x] Pass. Scatter exists. Clicking the `$1,207` / quality 8 dot opened Newport Dunes.
- [x] Pass. The four short-list cards exist and the picks change with the rig (under `$1,600` was Pacific on Class C and Silverland on Trailer + Tesla). The rank number printed on the other rig’s card is the active rig’s rank. See must-fix 8.
- [x] Pass. At 390px the table has its own horizontal scroll and the short-list cards scroll sideways. Page width stayed 390.
- [x] Pass. Walnut’s drawer has hookups, stay, extra vehicle, unhitch, leave-trailer, noise, and watch-outs. Newport’s drawer has the same set.
- [x] Pass. Every park in `src/data/parks.json` has `confidence`, `sources`, and `lastVerified` (`2026-09`). The drawer shows them.

### Public land

- [x] Pass. The teach panel on the tab explains BLM, USFS/MVUM, why NPS is not free dispersed, LTVAs and the `$180` season, 14-in-28, and “Yellow land is not a campsite.” Crown land is in the Canada card, not a US teach tile: “There is no single national polygon.”
- [x] Pass. Lede and the “Closest to Santa Monica” card say there is almost no trailer-friendly free BLM next to Santa Monica, and that the winter belt is Imperial, Blythe, Quartzsite, and Yuma, not Malibu.
- [x] Pass. BLM surface is the real SMA MapServer. Nine tiles rendered. PAD-US and the other two services answered `?f=json` with HTTP 200. PAD-US and recreation polygons are off until checked; their image export was not exercised.
- [x] Pass. The four known endpoints are the ones in `src/public.js`.
- [x] Pass. No CARTO tiles and no API-key string.
- [x] Pass. Basemap is Esri World Dark Gray. Attribution was visible on the land map (British Columbia view) and on the park map.
- [ ] Unknown. The failure banner exists in `showBanner` and the tab is built to keep working. This session’s layers loaded, so a failed load was not seen.
- [x] Pass. The click that returned a manager said “It does not say you can camp here. Posted signs win.” The no-hit branch in `src/public.js` says “A blank map is not a campsite.” That empty click was not the one performed. A BLM hit still adds “Dispersed camping is allowed on much of it unless posted closed,” which is the closest this page comes to permission.
- [x] Pass. Joshua Tree, Death Valley, and Lake Mead are `cost: "varies"` and the cards say they are not free roadside dispersed camping.
- [x] Pass. Seven LTVAs are `cost: "ltva"`. Cards say “Permit, not free” and quote `$180 / $80 / $40`. They are not `$0`.
- [x] Pass. No Mexico areas. OSM nodes south of the rough border are dropped. A Mexico click is copy, not a campsite. `src/lib/seasons.js` mentions “easy Mexico day trips” inside the unused Frontier module, not on this tab.
- [x] Pass. Thirteen provinces/territories in `src/data/canadaRules.json`, each with a stay rule and an official atlas link. Picking British Columbia opened that card and moved the map. Six Canada featured areas. No nationwide Crown polygon.
- [x] Pass. The OSM checkbox is labeled “Unofficial OSM camp hints.” Tooltips say “Unofficial OSM” and “Not a permit.”
- [x] Pass. Trailer + Tesla hid 4x4 and soft sand (Johnson Valley, El Mirage, Dumont, Imperial Sand Dunes, and the rest of that set). High-clearance cards that say “Trailer no” (Box Canyon, Gold Butte) stay on the list.
- [ ] Fail. July shows the low-desert heat warning and January’s note says to drop the high country, but the default “All featured areas” list stays 58 rows. January only dims them. They leave the list if the user also picks “In season this month.”
- [x] Pass. All required hubs are present, including Kamloops, Prince George, Cranbrook, Thunder Bay, and Whitehorse.
- [ ] Unknown. The file does not claim a Supercharger at Parker or Ehrenberg, and it marks Ridgecrest and Burns unconfirmed. Every `teslaSupercharger: "yes"` (including Whitehorse, Thunder Bay, Cranbrook, Prince George, Tonopah) was not checked against Tesla’s map.
- [x] Pass. 58 featured areas. Not 3, not a dirt-road dump.
- [x] Pass. Every featured area has `officialUrl`, `confidence`, `stayLimit`, and `access`. Mule Mountain’s URL is the wrong page. See must-fix 6.
- [ ] Fail. No on-page short lists for winter desert trailer, summer mountain trailer, closest belt to LA, LTVAs, or a Canada starter. LTVA, closest, and Canada exist as filters only.
- [ ] Fail. Footer says posted signs and the motor-vehicle map beat the site, and that color is not a campsite. It does not say “not permission,” “field office,” or “not a place to live.”

### Shared

- [x] Pass. One `package.json`, `npm run dev` serves both tabs. Confirmed in the browser.
- [x] Pass. The rig toggle is in the header on both tabs. It re-sorts paid parks and hides 4x4 / soft sand on public land.
- [x] Pass. No Campendium, iOverlander, or AllStays scrape. One Campendium URL is cited on Malibu. Fairplex cites an RV Life answer page as a source, and the monthly from that page is not used as `monthlyFrom`.
- [x] Pass. README explains both tabs, the rig toggle, and that rates and rules go stale.

## 5. UX / redesign — only if it blocks use

- Switching tabs does not scroll to the top. The header is `position: sticky`. After reading the paid chart, the public-land month slider sat under that header (slider top ~20px, header ~79px) and the click missed. The control exists. It is not reachable until you scroll.
- On a phone the header stacks to about 208px. Tabs and the rig toggle are still on screen at the top. The table and the short list scroll on their own. That part is usable.
- Public land has no short-list strip, so the two tabs do not answer the brief the same way. The paid tab leads with four decisions. The land tab leads with a primer and 58 cards.
- Default month behavior looks like a warning and does not change which rows you have to read. See checklist.
- `FRONTIER.md` points at `/frontier.html`. That URL is this app, not a Frontier planner. Anyone following the doc is in the wrong product with no explanation.

## 6. Missing features vs gold-plating

Must implement or the brief fails:

- Rank and scatter on a long-stay price, not the cheapest month in a wide range.
- Stay caps, including seasonal ones already written in `watchOuts`, change the stay column and the long-term rank.
- Far value (Ramona, Pismo, and anything else past a daily pier commute) cannot rank as a Santa Monica base.
- The five public-land short lists, and a month control that actually drops the wrong season.
- Drive minutes labeled as estimates.
- Walnut’s electric deposit and Dockweiler’s dry rate, or an explicit “not in this file.”
- Hubs and official URLs that point at the right town and the right page.
- Footer: not permission, field office wins, not a place to live.

Do not implement yet:

- Offline MVUM.
- Accounts.
- A live fire-ban API.
- Every BLM spur in the country.
- Mexico.
- Restyling the dark theme.
- The unused Frontier airport product (`src/frontier-main.js`, `src/data/us-market.json`, `src/data/frontier-*.json`, `scripts/emit-market.mjs`). It is not on the nav. Leave it out.

## 7. Recommended build order

1. Put Pismo’s 175 miles outside the 80–140 ring, or remove the pin from that ring.
2. Copy Golden Shore’s summer 14-night cap, and Walnut’s six-month approval, into the fields the stay column and `isLongTerm` already read.
3. Score Newport, Malibu, and any other wide monthly on the high or summer figure so the scatter and the rank stop using the floor.
4. Mark drive minutes as estimates, and add the missing Walnut deposit and Dockweiler dry rate or mark them unknown.
5. Keep Ramona and other 80–140 mile cheap monthlies out of the near-LA rank.
6. Point Angeles, Los Padres, and Holcomb at a real nearest town, and point Mule Mountain at its own official page.
7. Add the five public-land short lists and make January/July change the default list, not only the “In season” filter.
8. Add the footer sentences, and scroll to the top of a tab when it opens so the sticky header stops covering the month slider.

## 8. Risks

- Rates are stamped `2026-09` and were not re-checked live. A monthly that was true in the file can be wrong by the time someone calls.
- A BLM identify result says dispersed camping is allowed on much of that surface unless posted closed. That is still how someone talks themselves into a yellow polygon. The field office and the sign win, and the footer does not say so.
- Trailer + Tesla hides 4x4 and soft sand and still lists high-clearance desert (Box Canyon, Gold Butte) with “Trailer no.” A Model Y and a trailer can be sent onto those roads by a card that already knows the fit is no.
- Beach parks with a real cap are mostly kept out of the long-term short list. Newport, with a 180-night cap and a `$1,207` floor, is sold as a monthly-class score. Golden Shore’s summer 14-night cap is not in the score at all.
- Canada is a picker and six pins, which is the right shape, and it is easy to treat a US identify hit (the Tongass result) as if the same click meant Crown land. South of the 49th parallel, `inCanadaRough` does not fire. The empty-result sentence mentions that case. A hit on the wrong country does not.
