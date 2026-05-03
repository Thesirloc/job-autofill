# Releasing JobFill

Releases are automated. Every push to `main` (excluding docs-only and `web/`-only changes) bumps the version, tags it, builds the zip, attaches it to a GitHub Release, and uploads it to the Chrome Web Store as a draft.

## Day-to-day rules

- **Never edit `version` in `manifest.json` by hand.** The release workflow owns it. Hand-edits will fight the auto-bump.
- **Use Conventional Commits** in your commit messages. They drive the bump:

  | Commit subject                             | Bump  |
  |--------------------------------------------|-------|
  | `feat: …` / `feat(scope): …`               | minor |
  | `feat!: …` / any commit with `BREAKING CHANGE:` footer | major |
  | anything else (`fix:`, `chore:`, `refactor:`, no prefix, …) | patch |

- Docs-only, `web/`-only, or `*.md`-only pushes do **not** trigger a release (see `paths-ignore` in `.github/workflows/release.yml`).

## What happens on every push to main

1. Workflow inspects commits since the last tag and decides patch / minor / major.
2. Workflow patches `manifest.json` to the new version.
3. Workflow builds `dist/jobfill-v<version>.zip` (allowlisted files only — `manifest.json`, `background/`, `content/`, `icons/`, `lib/`, `options/`, `popup/`).
4. Workflow commits the bump as `chore(release): v<version>`, tags `v<version>`, pushes both to main.
5. A GitHub Release is created with the zip attached and auto-generated release notes.
6. If Chrome Web Store credentials are configured (see below), the zip is uploaded as a **draft** to the listing. **You still click "Submit for review" in the Developer Dashboard manually** — this is intentional, to avoid auto-resubmitting on every commit.

## One-time setup: Chrome Web Store credentials

The Chrome Web Store Publish API requires an OAuth2 refresh token. This is the only manual setup; once done, every release uploads automatically.

1. **Enable the API.** Go to <https://console.cloud.google.com/>, create or pick a project, enable the **Chrome Web Store API**.
2. **Create OAuth credentials.** APIs & Services → Credentials → Create Credentials → OAuth client ID → application type **Desktop app**. Save the client ID and client secret.
3. **Get a refresh token.** In a terminal, run the helper:
   ```bash
   npx -y chrome-webstore-upload-keys
   ```
   It prints a URL — open it, sign in with the Google account that owns the Web Store listing, paste the resulting code back into the terminal. It outputs a refresh token. **Save it.**
4. **Add four secrets to the GitHub repo** (Settings → Secrets and variables → Actions → New repository secret):

   | Secret name             | Value                                           |
   |-------------------------|-------------------------------------------------|
   | `CWS_EXTENSION_ID`      | `pklbckmbfelophfmafebagiiamlkjkcn`              |
   | `CWS_CLIENT_ID`         | OAuth client ID from step 2                     |
   | `CWS_CLIENT_SECRET`     | OAuth client secret from step 2                 |
   | `CWS_REFRESH_TOKEN`     | Refresh token from step 3                       |

If any secret is missing, the workflow logs a warning and skips the upload step but still builds the zip and creates the GitHub Release — so you can always grab the zip from the Release artifacts and upload by hand.

## Local builds

You don't need to run the workflow to build a testable zip. From the repo root:

- macOS / Linux / WSL / Git Bash:
  ```bash
  bash scripts/build.sh
  ```
- Windows PowerShell (5.1 or 7+):
  ```powershell
  .\scripts\build.ps1
  ```

Both produce:

- `dist/jobfill-v<version>.zip` — what the Web Store would see.
- `dist/unpacked/` — point Chrome's **Load unpacked** at this directory to test exactly what's in the zip without re-extracting each time.

## Force a specific bump

If you need to ship a `feat` change but the commit subject doesn't say so (e.g. you forgot the prefix), append a properly-formatted commit on top before pushing — even an empty one works:

```bash
git commit --allow-empty -m "feat: <one-line description of the user-visible change>"
git push
```

## Manual escape hatch

If automation is broken, you can always:

1. Run `bash scripts/build.sh` (or the `.ps1`) locally.
2. Upload `dist/jobfill-v<version>.zip` via the Chrome Web Store Developer Dashboard.

Just be aware the next push to main will auto-bump from whatever version is currently in `manifest.json`, so the manual upload's version should match what the workflow would have produced.
