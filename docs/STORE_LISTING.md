# Chrome Web Store Listing — JobFill

Everything you need to paste into the Chrome Web Store Developer Dashboard when submitting.

---

## 1. Name (max 45 chars)

```
JobFill — AI Job Application Autofill
```
*(38 chars)*

## 2. Summary / Short description (max 132 chars)

```
One-click autofill for Greenhouse, Lever, and Workday job applications. Optional AI drafts. Local-first — no tracking.
```
*(~119 chars)*

## 3. Category

**Productivity** (primary). Alternative: *Workflow & Planning Tools*.

## 4. Language

English (United States).

---

## 5. Detailed description

> Paste this into the "Description" field. The store renders plain text with line breaks and bullet points; no Markdown.

```
JobFill autofills job applications on Greenhouse, Lever, and Workday from your saved profile and resumes — and drafts thoughtful answers to open-ended questions using the LLM you choose.

WHAT IT DOES
• One-click autofill: name, email, phone, links, location, current role, education, work authorization, and EEO fields are mapped from your profile in a single click.
• Tagged resumes: upload multiple resumes (Backend, Frontend, AI/ML, …) and pick the right one for each role from the popup or the on-page panel.
• AI drafts on demand: a "Draft with AI" button appears above long-answer questions like "Why this company?" or "Tell us about a project you're proud of."
• Resume upload that works: files are wired through DataTransfer so they attach correctly to hidden file inputs behind styled "Attach" buttons.
• Smart field matching: regexes against label, name, placeholder, aria-label, data-automation-id, and autocomplete attributes — robust to renaming.

PRIVACY BY DEFAULT
• Profile, resumes, snippets, and API keys are stored only in chrome.storage.local on your machine.
• The extension makes outbound calls only when you click "Draft with AI" or "Test connection" — and only to the AI provider you configured.
• No analytics, no telemetry, no servers operated by JobFill. There is no JobFill server.
• Use Data → Export all data to back up. Clear all data wipes everything.

BRING YOUR OWN MODEL
Use gpt-4o-mini, claude-haiku-4-5, or any OpenAI-compatible endpoint. Test the connection from the options page before relying on it.

CAVEATS
• Workday is a moving target. Single-page navigation, custom widgets, and per-tenant theming mean some fields won't be detected. Autofill is best-effort — check every page before submitting.
• The AI-draft prompt is conservative: it tells the model to use only facts from your profile and to leave a [bracketed placeholder] rather than make things up. Always review every draft.
• API keys live in chrome.storage.local with whatever protection Chrome provides for that store. Don't install on a shared machine.

GETTING STARTED
1. Install the extension. The options page opens automatically the first time.
2. Fill out your profile: name, contact info, work history, education.
3. Upload one or more resumes and tag each (e.g. "Backend", "AI/ML").
4. Optional: pick an AI provider, paste your API key, set a model, and click Test connection.
5. Open any application page on Greenhouse, Lever, or Workday — a small JobFill panel appears in the bottom-right.
```

## 6. Single-purpose declaration

> Required field. The store will not accept vague answers.

```
Autofill job applications on Greenhouse, Lever, and Workday using a saved profile and resumes, and optionally draft answers to open-ended questions using a user-supplied LLM API key.
```

---

## 7. Permission justifications

> The dashboard has a separate textarea for each permission. Paste each block into the matching field.

### `storage`
```
Stores the user's profile (name, contact info, work history, education), uploaded resume files, AI provider configuration, and saved snippets in chrome.storage.local. All data is kept on the user's device; the extension has no backend.
```

### `activeTab`
```
Used to read the active job application page when the user opens the popup or clicks an action button, so the extension can detect the ATS (Greenhouse, Lever, or Workday) and populate fields. Activated only in response to user interaction with the extension.
```

### `scripting`
```
Used to programmatically inject the autofill logic into the active tab when the user clicks Autofill in the popup. Combined with activeTab, this scopes injection to a user-initiated action on the current page.
```

### Host permissions — Greenhouse (`*.greenhouse.io`, `boards.greenhouse.io`, `job-boards.greenhouse.io`)
```
The content script runs on Greenhouse-hosted application forms to detect input fields, populate them from the user's saved profile, and attach the selected resume to the file input.
```

### Host permissions — Lever (`*.lever.co`, `jobs.lever.co`)
```
The content script runs on Lever-hosted application forms to detect input fields, populate them from the user's saved profile, and attach the selected resume to the file input.
```

### Host permissions — Workday (`*.myworkdayjobs.com`, `*.workday.com`)
```
The content script runs on Workday-hosted application forms to detect input fields (using data-automation-id and standard label/name/aria attributes), populate them, and attach the selected resume.
```

### Host permission — `api.openai.com`
```
The extension calls the OpenAI API only when the user clicks Draft with AI on a long-answer textarea, or clicks Test connection in the options page. The user supplies their own API key. No request is made automatically or in the background.
```

### Host permission — `api.anthropic.com`
```
The extension calls the Anthropic API only when the user clicks Draft with AI on a long-answer textarea, or clicks Test connection in the options page. The user supplies their own API key. No request is made automatically or in the background.
```

### Host permission — `generativelanguage.googleapis.com`
```
The extension calls the Google Gemini API only when the user clicks Draft with AI on a long-answer textarea, or clicks Test connection in the options page. The user supplies their own API key. No request is made automatically or in the background.
```

---

## 8. Data usage disclosures

> The dashboard presents a checklist. Use these answers.

| Data type | Collected? | Transmitted? | Notes |
|---|---|---|---|
| **Personally identifiable info** (name, address, email, phone) | Yes | No | Stored only in `chrome.storage.local`. Sent to the user's chosen LLM provider only when the user clicks Draft with AI. |
| **Authentication info** (API keys) | Yes | No | Stored only in `chrome.storage.local`. Used to authenticate the user's own outbound calls to their chosen LLM provider. |
| **Website content** | Yes | Yes (limited) | The visible job-posting text on the active page is included in the AI prompt **only** when the user clicks Draft with AI. Never transmitted otherwise. |
| **Location** | Optional | No | Only if the user enters city/state/country in their profile. Stored locally. |
| Health information | No | — | — |
| Financial / payment info | No | — | — |
| Personal communications | No | — | — |
| Web history | No | — | — |
| User activity / clicks | No | — | — |

### Required certifications (check all three)
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL
After deploying the `web/` folder, this should be:
```
https://<your-domain>/privacy.html
```
(For example, `https://jobfill.app/privacy.html` or `https://thesirloc.github.io/job-autofill/privacy.html`.)

---

## 9. Screenshots

**Spec:** at least 1, max 5. Required size **1280×800** (or **640×400**). PNG or JPEG. 1280×800 is strongly preferred for new listings.

I cannot capture real screenshots without driving a browser with the extension loaded, so here is the recommended shot list for you to capture. Use **fake personal data** (e.g. "Jane Doe", `jane.doe@example.com`, `+1 555-0100`) so nothing real is exposed in the listing.

### Shot list (capture in this order, use the first 3–5)

1. **Hero shot — Greenhouse autofill in action**
   *Frame:* Real Greenhouse application page (e.g., a hiring company's public listing). Popup open in the top-right corner showing "Autofill form" highlighted, with a "14 / 14 filled" success message.
   *Why:* Communicates the entire value prop in one image.

2. **On-page panel — Lever**
   *Frame:* A Lever application form. The bottom-right JobFill panel visible. Form fields populated.
   *Why:* Shows the in-page UX (not just the popup) and proves multi-ATS support.

3. **AI draft — Workday long answer**
   *Frame:* A Workday "Why this company?" textarea, with the "Draft with AI" button visible above it and a generated draft populated in the textarea (with one `[bracketed placeholder]` visible — proves the conservative drafting story).
   *Why:* Shows the differentiated AI feature without making it look like the model invents facts.

4. **Options — Profile tab**
   *Frame:* The options page on the Profile tab, with a fully populated fake profile (name, email, work history with one or two entries, education).
   *Why:* Reassures users that setup is structured and one-time.

5. **Options — Resumes tab**
   *Frame:* The Resumes tab with 2–3 uploaded resumes, each with a tag (Backend / Frontend / AI/ML).
   *Why:* Highlights the multi-resume + tagging story.

### Capture how-to

- **Windows:** Press `Win + Shift + S`, drag a region. Or use ShareX / Greenshot for pixel-perfect 1280×800 captures.
- **macOS:** `Cmd + Shift + 4`, drag a region. Or CleanShot X for fixed dimensions.
- Resize/crop to exactly 1280×800 in any image editor (Photoshop, Affinity, GIMP, or web tools like Photopea / squoosh.app).
- Lightly blur or replace any real company names/logos in the URL bar if you want to avoid implying endorsement.

### Optional promo assets
- **Small promo tile:** 440×280 PNG. A clean banner with the JF logo + the line "Autofill job applications, fast." on a `#111827` background.
- **Marquee promo tile:** 1400×560. Skip unless Google features your extension.
- **YouTube demo:** 30–60s screen recording of the autofill flow. Embed the URL in the listing — listings with video convert noticeably better.

---

## 10. Submission checklist

Before clicking **Submit for review**:

- [ ] `manifest.json` version bumped if this is an update
- [ ] Zip contains only the extension files (exclude `web/`, `.git/`, `.claude/`, `STORE_LISTING.md`, `node_modules/`)
- [ ] Privacy policy URL is publicly reachable (test in an incognito window)
- [ ] All permission justification fields filled in
- [ ] Data-usage checklist filled in and certifications checked
- [ ] At least 1 screenshot uploaded; 3–5 ideal
- [ ] Single-purpose declaration filled in
- [ ] Support email set in the developer dashboard (required, displayed publicly)
- [ ] Tested the packaged zip by loading it unpacked into a clean Chrome profile

After approval, swap `INSTALL_URL` in `web/index.html` to the live listing URL and redeploy the site.
