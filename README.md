# Prep Kit — frontend

Next.js UI for the AI Interview Prep Kit. Talks to the separately deployed
[prepkit-backend](../prepkit-backend) API over HTTP with a credentialed cookie — see that
repo for the pipeline, the batch entry point, and the architecture writeup.

## Run locally

```bash
npm install
cp .env.example .env      # point NEXT_PUBLIC_API_URL at your running backend
npm run dev                # http://localhost:3000
```

Requires the backend running separately (default `http://localhost:4000`).

## What's here

```
src/
  app/                 Next.js App Router pages: auth, kit list, builder, practice, weak spots
  components/ui/       hand-written primitives (Button, Dialog, Field, ...) — semantic-token
                        colours only, so an off-palette colour is a compile-time impossibility
  components/patterns/ AsyncBoundary, SectionCard, EditableText, SortableList, OriginBadge
  components/kit/      the kit sections (brief, role, question bank, flashcards, schedule)
  hooks/useJobProgress  SSE client with a polling fallback after two failed reconnects
  lib/api.ts           the one place the browser calls the API (credentials, error shape)
  lib/kit-types.ts     wire types mirroring the backend's Appendix A contract
```

## Design system

`src/app/globals.css` defines semantic tokens only (`--bg`, `--surface`, `--accent`, …);
`tailwind.config.ts` exposes nothing else as a colour utility. Light/dark both defined; the
non-`prefers-color-scheme` dark block and the explicit `data-theme="dark"` block both handle
the OS-level and manual-toggle cases.

## Deploy

Vercel. Set `NEXT_PUBLIC_API_URL` to the backend's public URL as a build-time env var.

If the backend is on a different domain (the normal case for two separate deployments), the
backend needs `COOKIE_MODE=cross-site` and this frontend's deployed origin added to its
`CORS_ORIGINS` — see the backend README's Security section for why that pairing matters.
