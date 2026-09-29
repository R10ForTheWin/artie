# ARTIE

A training log and race tracker for a prone paddleboard crew out of Redondo Beach, training for the Catalina Classic, a 32-mile open-ocean race from Catalina Island to the Manhattan Beach Pier. The name comes from R10, the buoy off Palos Verdes the crew paddles out to and back from.

**[Open the live app →](https://artie-r10.up.railway.app)** (tap *Skip for now* to look around without an account)

![ARTIE Dashboard](ARTIE%20for%20Github.png)

## What it does

- **Logs workouts from whatever you have.** Paste a Garmin activity link, add screenshots of the Garmin app's Overview, Stats, Laps and Charts tabs, or enter a paddle or swim by hand. A `.gpx`, `.fit` or Garmin CSV export works too.
- **Reads Garmin screenshots with Claude.** Each screenshot is sent to Claude, which works out which tab it is and copies every value exactly as shown; units are converted in code, not by the model. A link plus screenshots, picked all at once in any order, becomes one workout, and pieces added later fill in what an existing workout was missing.
- **Mileage Tracker.** A per-season leaderboard of paddle, ocean-swim and pool-swim miles, above a month-by-month log.
- **Records.** Fastest 1, 2 and 3 back-to-back miles, from mile splits.
- **Races.** Countdowns to upcoming races with sign-up links, and results for past ones with the crew highlighted, matched by first and last name so a stranger with the same surname isn't.
- **Conditions.** Live and still-photo surf cams for Topaz, the Manhattan Beach Pier and Hermosa, with water temperature, wave height and morning wind.
- **Imports** from Strava and from Reggie, a companion swim-registration app.

Only the readings people trust are kept: heart rate only for athletes who wear a chest strap, and stroke counts only for swims.

## How it's built

- **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**
- **PostgreSQL** on Supabase
- **Claude Haiku** (Anthropic API) for reading screenshots and share cards
- **Railway** for hosting, deploying from `main`
- NOAA buoy data and Open-Meteo for conditions

Sign-in is a name plus a shared team code, kept in a signed cookie so middleware can check it without a database round trip. Guests can browse everything but change nothing.

## Status

In daily use by the crew and evolving with it.
