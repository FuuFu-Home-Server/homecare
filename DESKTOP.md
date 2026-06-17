# HomeCare Desktop (Windows)

Offline-first Electron build of HomeCare. One installable `.exe`; all data stays
on the device in an encrypted SQLite database.

## Building the installer

The native modules (`better-sqlite3-multiple-ciphers`, `@node-rs/argon2`) compile
against the Electron ABI, so **the installer must be built on Windows** (or a
Windows CI runner). Cross-building from Linux/macOS will not produce a working
native binary.

```powershell
npm ci
npm run dist        # → release/HomeCare-<version>-setup.exe (no upload)
```

`npm run dist` runs, in order: static renderer export (`build:desktop`), the
esbuild main/preload bundles (`electron:build`), then `electron-builder --win`.

### Publishing a release (auto-update)

Auto-update pulls from **GitHub Releases** via `electron-updater`.

1. In `electron-builder.yml`, set `publish.owner` to the GitHub account/org that
   owns the repo (set to `FuuFu-Home-Server` / `homecare`).
2. Export a token with `repo` scope: `set GH_TOKEN=ghp_...`
3. Bump `version` in `package.json`, then:

```powershell
npm run release     # builds + uploads the installer & latest.yml to a GitHub Release
```

The running app checks for updates on launch, downloads in the background, and
installs the new version on quit. Update checks are best-effort: an offline
clinic is never blocked.

> **Note (CJS interop):** esbuild externalizes deps and bundles the main process
> as CJS. `electron-updater` ships `__esModule` with no `default` export, so a
> default import + `.default` destructure resolves to `undefined` and crashes the
> packaged app on launch (`Cannot destructure property 'autoUpdater'`). Always use
> a **named import** (`import { autoUpdater } from "electron-updater"`). Same rule
> for any external CJS dep imported in `electron/*`.

## Code signing

The build is **unsigned**. On first run Windows SmartScreen shows
"Windows protected your PC" → click **More info** → **Run anyway**. To sign,
add a cert and `win.certificateFile` / `CSC_LINK` + `CSC_KEY_PASSWORD` env, then
rebuild.

## Where data lives

Everything sits under the OS user-data dir (`%APPDATA%/HomeCare`):

- `clinic.db` — the encrypted database (SQLCipher).
- `keystore.json` — wrapped master key (owner password + recovery key). **Back up
  with the DB; without it the data cannot be opened.**
- `backups/` — automatic encrypted snapshots (kept: most recent N, see config).
- `logs/main.log` — main-process log + crash trail (rotates at ~1 MB).

Updating the app never touches this directory, so data survives upgrades.

## Encryption, passwords, recovery

- The DB is encrypted at rest. The key is derived from the **owner (perawat)
  password** (Argon2id) and also wrapped by a one-time **recovery key** shown
  once during first-run setup.
- **Save the recovery key offline.** Forgotten password **and** lost recovery key
  = data is unrecoverable by design.
- Forgot the password? On the login screen → **Lupa password?** → enter username +
  recovery key + a new password.
- Staff (asisten) accounts each get their own wrapped key entry; adding/removing
  staff or changing a password keeps the keystore in sync automatically.

## Backups

- Automatic encrypted snapshots run on launch and on a fixed cadence.
- Restore from **Pengaturan → Cadangan** (validates the snapshot, takes a safety
  copy of the current DB first, then swaps). Restart the app afterwards.
- An encrypted backup is only usable together with the matching `keystore.json`.
