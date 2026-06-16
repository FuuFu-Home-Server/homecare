# HomeDoc — Desktop (Electron) Production Plan

Offline-first Electron desktop wrap of the existing Next.js app. No rewrite of UI or repositories. Preserves every CLAUDE.md rule: layer flow, SQL-only-in-`lib/db`, strict typing, schema.sql+migrate() dual-write, integer rupiah, WIB helpers, DataTable/Column<T>, StatusPill tones, append-only records.

## 1. Architecture

### Process split
```
main (Node)            preload (bridge)        renderer (existing Next UI)
─────────────          ────────────────        ───────────────────────────
better-sqlite3   <IPC> contextBridge      <—   pages → hooks → fetcher
lib/db/*  (SQL)        typed window.api         (call sites UNCHANGED)
migrations/backup      contextIsolation:true
auth/session           nodeIntegration:false
print pipeline         no remote
```

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox` on, no remote module.
- better-sqlite3 + all `lib/db/*` execute in **main only**. Renderer never imports them.
- Renderer reaches data through `window.api.<channel>(payload)` exposed in preload, typed by a shared `IpcMap` interface (mirrors repository signatures 1:1).

### IPC vs app/api — DECISION
**Keep both, behind one fetcher seam.** Build Next as static export for the renderer; `app/api/*` route handlers are **retired for desktop** but kept in-tree for a possible future web build (gated, not bundled into Electron). The current [fetcher.ts](src/lib/fetcher.ts) `getJson/postJson/...` becomes the switch point:
- Desktop: fetcher calls `window.api.invoke(method, path, body)` → IPC → handler → `lib/db`.
- Web (future): fetcher does real `fetch("/api/...")`.
Call sites in hooks stay identical. IPC handlers and route handlers share the **same** repository + validation + RBAC helpers (one `handlers/` module both import), so logic is never duplicated.

### Build shape
- `electron/main.ts`, `electron/preload.ts`, `electron/ipc/*` (dispatch + RBAC policy), `electron/db/*` (path resolution, backup, encryption key).
- Renderer = `next build` static export (`output: 'export'`) served via custom protocol (`app://`) from main. No localhost port, fully offline.

### Locked implementation design (transport = IPC + static export)
Audit found **19/20 pages are Server Components**; 5 read `lib/db` during SSR. Static export forbids SSR-DB and dynamic API route handlers. Resolution:
- **Shared handler extraction.** Move each route's core logic into `src/lib/api/<mod>.ts` pure functions `(input, ctx)=>result`. `app/api/*` routes become thin wrappers (kept for future web build). The IPC dispatcher in main imports the **same** `lib/api/*` functions. One logic home — satisfies "one handlers module both import".
- **Session = transport-agnostic via AsyncLocalStorage.** Rewrite `lib/session.ts`: `currentUser()` reads the user from an ALS context, not `next/headers` cookies. Main's IPC dispatcher runs each call inside `als.run({user}, fn)` seeded from the main-process session store (set on login IPC). Web (future) seeds ALS from the iron-session cookie in middleware. Removes the cookie coupling that blocks running handlers in main.
- **RBAC policy table** in the dispatcher: every `method+path` declares allowed roles; asisten hitting a perawat-only path is rejected in main. Fixes today's authn-only gap centrally.
- **SSR pages → client + IPC.** Refactor the 5 DB-reading Server Components ([(app)/layout.tsx], dashboard, pasien/[id], print/struk/[billId], root page) to client components fed through the fetcher→IPC seam. After this, the renderer never touches `lib/db`.
- **Static export friction:**
  - `app/api` cannot exist in an export build (non-GET handlers error). Desktop build script sidelines `src/app/api` during `next build`, restores after. Routes stay in-tree for web.
  - Dynamic routes (`[id]`,`[visitId]`,`[billId]`) get `generateStaticParams = () => [{...:"_"}]` to emit a template; the `app://` protocol handler in main prefix-maps real ids (`/pasien/123`) to the template; client reads the real id via `useParams()`/location.
- **fetcher seam.** `lib/fetcher.ts` detects `window.api` (desktop) → `window.api.invoke(method,path,body)`; else real `fetch`. Hook call sites unchanged.

### Sub-steps (committed increments)
- **2a** Electron shell + esbuild build for main/preload + single-instance + window-state. Opens window on existing dev server. ← building now
- **2b** better-sqlite3 + `getDb` to main; `lib/api/*` extraction; IPC dispatcher + RBAC table; preload `window.api`.
- **2c** fetcher transport switch; session→ALS; auth login/logout/me over IPC; main session store.
- **2d** Refactor 5 SSR pages → client+IPC; `next.config` export + api sideline script + dynamic-route templates; `app://` protocol. App runs fully over IPC, no port.

### Lifecycle
- `app.requestSingleInstanceLock()` — second launch focuses existing window.
- `before-quit` → `db.close()` (flush WAL) once.
- `electron-window-state` persists window bounds in user-data.

## 2. Data layer

### Location
- Move DB to `app.getPath("userData")/clinic.db`. `DB_PATH` becomes a function resolving userData in prod, project `db/` in dev (env flag). Updates replace app bundle, never the DB.

### Versioned migrations
- Extend `migrate()` into a runner keyed on `PRAGMA user_version`:
  - `migrations: { version: number, up(db): void }[]`, ordered.
  - On launch: read `user_version`, apply each `up` > current in a transaction, bump `user_version`.
  - Existing additive ALTERs become migration #1 (idempotent guards kept for already-seeded DBs).
- **Dual-write rule kept:** every new table/column lands in `db/schema.sql` AND a migration step. schema.sql = fresh-DB truth; migrations = upgrade path.
- `db:reset`/`db:seed` scripts **dev-only** — refuse to run when `NODE_ENV=production` / packaged.

### Integrity
- Keep `journal_mode=WAL`, `foreign_keys=ON`. Add `busy_timeout` (e.g. 5000ms) for the 2-user lock case. Periodic `PRAGMA quick_check` on launch + before backup; surface failures in Pengaturan.

### Backup / restore
- Manual: one-click export → `VACUUM INTO` a timestamped file to user-chosen dir (saved in settings).
- Auto: on launch + daily timer, `VACUUM INTO` backups/, keep last N (config). Encrypted-DB backup stays encrypted.
- "Last backup: <tglJamWIB>" status row in Pengaturan. Restore = pick file → integrity check → swap on next launch.

### Encryption at rest
- `better-sqlite3-multiple-ciphers` (SQLCipher-compatible). Key derived from the login password (Argon2id) → DB key via `PRAGMA key`.
- **Tradeoff:** key tied to login means DB unreadable without a valid account (good for a clinic PC), but a forgotten password = unrecoverable DB → mitigated by an admin recovery key generated at first-run setup, shown once, stored offline by the owner. Document clearly.
- Alternative considered: OS keychain (`safeStorage`) holding a random DB key. Less "derived from login" but survives password change. **Open question — choose model.**

## 3. Auth & RBAC

- Replace `DemoAuth` with `LocalAuth` behind the existing `AuthService` interface — **call sites untouched**. Drop `switchToRole`. Argon2id hashing (replace bcryptjs, or keep bcryptjs to avoid native dep — open question; argon2 is native, adds build complexity for Electron).
- Per-user accounts (perawat, asisten). Login → derive DB key → unlock DB.
- Session: iron-session cookie assumes HTTP. Desktop → in-main session object + idle timer instead. Lock screen overlay in renderer; idle auto-lock (config minutes) re-prompts password (re-derives key only if needed; keep key in main memory, zeroed on lock).
- **RBAC at the IPC/data boundary:** central `requireRole(method, session)` map — every IPC channel declares allowed roles. asisten calling a perawat-only channel (rekam medis, penggajian, manajemen staf) → rejected in main, regardless of renderer. This fixes the current authz gap (routes only check authn today).
- Every **write** channel validated with **zod** at the IPC boundary (add `zod` dep; migrate `lib/validation/*` from hand-rolled `string|T` to zod schemas, same return contract via `safeParse`). Never trust renderer input.
- Keep/extend append-only `record_access_log`.

## 4. Reliability / tests / packaging

- Renderer global error boundary (`app/(app)/error.tsx` exists — extend to root) + main `process.on("uncaughtException"/"unhandledRejection")`. No white screens; crash → friendly dialog + log.
- Rotating log file in `userData/logs` (electron-log).
- Tests: add **vitest**. Cover pure logic — `fefo.ts`, bill assembly, migration runner, payroll auto-expense. `npm test` + keep typecheck/lint green in a check script.
- Perf: paginate DataTable-backed queries against SQLite (keyset/LIMIT-OFFSET) — `listPatients`, visit history, etc. currently `SELECT *`. Add paged repository variants.
- Packaging: **electron-builder**, Windows NSIS target (assumed). Auto-update via **electron-updater** (GitHub Releases channel, configurable). Signed if cert provided, else documented unsigned install + SmartScreen note.

## 5. Product polish

- First-run wizard: create first perawat (password + recovery key), clinic identity + SIPP → `clinic_settings` (not seed), choose backup location.
- Remove seeded users / demo login / role-switch / reset button from production builds. Clean empty-state onboarding. Separate `dev` seeded mode preserved.
- Print: Electron `webContents.print()` + `printToPDF` for struk. Correct margins, Indonesian formatting, SIPP on document. Replace bare `window.print()`.

## Build order (gated, pause after step 1)
1. **This plan + approval.** ← you are here
2. Electron shell + typed preload IPC + better-sqlite3 to main; existing UI in a window over IPC.
3. DB → userData + versioned migrations + integrity + encryption + backup/restore.
4. Real auth + lock/idle + RBAC at IPC + zod validation + secret storage.
5. Setup wizard + Pengaturan identity/SIPP + print pipeline + remove demo affordances.
6. Tests (fefo, billing, migrations, payroll) + error boundaries + logging.
7. electron-builder + electron-updater + client docs (install/update/backup).
8. Hardening: offline full-visit run-through, IPC/secret security review, large-dataset perf.

## Decisions (locked 2026-06-16)
1. **OS target — Windows only.** electron-builder NSIS target; macOS/Linux out of scope.
2. **Encryption key — login-derived (Argon2id) + owner recovery key.** DB key from password; one-time recovery key issued at first-run, owner stores offline. Forgotten password + lost recovery = unrecoverable (documented).
3. **Hashing — Argon2id.** Add native `argon2`; electron-builder rebuilds it per-target (only win32). Same native-rebuild step covers `better-sqlite3-multiple-ciphers`.
4. **zod — convert all `lib/validation/*`.** Single pass; every parser → zod schema, `safeParse`, same `string|T` return contract preserved at the route/IPC seam.

## Still open (non-blocking for step 2)
- **Renderer serving** — static export via `app://` (recommended) vs `next start` in-process. Resolve by auditing pages for Server-Component/route-handler dependencies at start of step 2 (most pages are `"use client"`).
- **Auto-update host** — GitHub Releases vs private/none. Deferred to step 7; clinic may lack a public repo (could ship manual-update installers instead).
