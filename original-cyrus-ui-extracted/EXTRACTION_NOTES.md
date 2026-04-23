# Original CYRUS UI (Replit export snapshot)

This directory holds a **copy of the Command Center** as exported from Replit (`original-cyrus-ui-extracted/client/`). It has the **same routes** as **`client/`** at the repo root (Command, Modules, Vision, Documents, …) with slightly older shell styling.

## Which tree is the default?

At monorepo root, **`vite.config.ts`** defaults to **`../client`** (the **VS Code** tree you moved with the project). To run this Replit snapshot instead:

```bash
npm run dev:replit
# or
CYRUS_UI_ROOT=original-cyrus-ui-extracted/client npm run dev
```

## Entry points (under `client/` here)

- `client/src/components/AccessGate.tsx`
- `client/src/components/Dashboard.tsx`
- `client/src/App.tsx`
- `client/src/components/IntroSequence.tsx`

## Not the Command Center

- **`cyrus_replit_upload/`** at repo root: static HTML landing, not this React app.
