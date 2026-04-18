# 🌲 Gnomie Sanctuary — Farcaster Snap

A Farcaster Snap where every user claims their own unique ASCII Gnomie, deterministically generated from their FID. Shares as plain ASCII text in casts.

## How it works

- Each FID gets exactly one Gnomie — same FID always produces the same Gnomie
- The snap renders the Gnomie as a PNG (white on black, Liberation Mono font) for identical display on desktop and mobile
- Sharing a Gnomie composes a cast with plain ASCII art + preserved indentation
- Claims persist via Turso KV (falls back to in-memory for local dev)

## Gnomie anatomy

```
   ^          ← hat tip
 / * \        ← hat brim (* = starred variant)
<(o_o)>       ← face (eyes + mouth, various bracket styles)
 / x \        ← body symbol
```

## Local dev

```bash
npm install
npm run dev      # starts on :3003 with JFS verification skipped
npm test         # run Gnomie generator smoke tests
npm run typecheck
```

Then open the [Farcaster Snap Emulator](https://farcaster.xyz/~/developers/snaps), enter `http://localhost:3003`, and test the full claim flow.

## Deploy to Vercel

```bash
vercel
```

Set these environment variables in your Vercel project dashboard:

| Variable | Value |
|---|---|
| `SNAP_PUBLIC_BASE_URL` | Your deployment URL, e.g. `https://gnome-snap.vercel.app` |
| `NODE_ENV` | `production` |
| `TURSO_DATABASE_URL` | From your Turso dashboard |
| `TURSO_AUTH_TOKEN` | From your Turso dashboard |

## Turso setup (persistent storage)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a database
turso db create gnome-snap

# Get credentials
turso db show gnome-snap --url
turso db tokens create gnome-snap
```

Without Turso credentials the server runs with in-memory storage — claims reset on restart.

## Project structure

```
gnome-snap/
├── src/
│   ├── index.ts        ← server, snap handler, PNG route
│   ├── gnome.ts        ← deterministic gnome generator
│   ├── render-png.ts   ← satori + resvg PNG renderer
│   └── test.ts         ← determinism + alignment tests
├── assets/
│   └── LiberationMono-Regular.ttf  ← bundled font (must be committed to git)
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.example
```

## PNG image route

`GET /img/:fid` renders the Gnomie for a given FID as a PNG and returns it with long-lived cache headers. The snap's `image` element points here. Results are cached in memory per process.
