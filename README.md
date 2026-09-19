# Teameo

A mobile app for finding sport partners and joining active communities. Two core pillars: a fast, low-friction first match, and a community worth coming back to.

## Monorepo layout

```
apps/
  api/     Node.js + TypeScript + Express + Prisma + Socket.IO backend
  mobile/  Expo (React Native) app, expo-router
```

## Product architecture

Four layers, each building on the last: **Profile** (who you are) → **Activity** (a listing) → **Match** (request → approve → chat → Event) → **Community** (recurring infrastructure once a user becomes an Organiser).

See `docs/FEATURES.md` for the full feature-to-code map (F1–F16) and `apps/api/prisma/schema.prisma` for the data model.

## Getting started

```bash
cp .env.example .env
npm install
npm run db:up          # Postgres + PostGIS via Docker
npm run db:migrate
npm run db:seed
npm run dev:api         # http://localhost:4000
npm run dev:mobile      # Expo dev server
```

## What's real vs. stubbed in this scaffold

Everything in the product/technical spec is modeled and wired end-to-end (routes, DB schema, sockets, screens). Three integrations that need external accounts are implemented behind swappable interfaces and default to a `log` driver so the app runs fully offline:

| Concern | Interface | Default (dev) | Production |
|---|---|---|---|
| Push notifications | `apps/api/src/lib/push.ts` | logs to console | FCM (Android) / APNs (iOS) |
| Calendar sync | `apps/api/src/lib/calendar.ts` | logs to console, marks `synced` | Google Calendar API (OAuth2) / Apple EventKit-CalDAV |
| Media storage | `apps/api/src/lib/media.ts` | writes to local disk | S3 / GCS behind a CDN |

Swap a driver by implementing its interface and switching the `*_DRIVER` env var — no call-site changes needed.

## Design system

Orange `#EE5B00` primary · Sage `#2E7D32` / `#E8F5E9` secondary · off-white `#FFF9EE` background · `#01232E` neutral dark (text) · Josefin Sans typography · 16–24px corner radius · `shadowOpacity: 0.08` · all touch targets ≥ 44×44px. Tokens live in `apps/mobile/src/theme.ts`.
