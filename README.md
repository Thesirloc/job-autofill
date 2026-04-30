# JobFill — AI Job Application Autofill

A Chrome extension (Manifest V3) that fills job application forms on **Greenhouse**, **Lever**, and **Workday** using your stored profile, lets you pick from multiple tagged resumes, and drafts open-ended answers with the LLM of your choice (OpenAI, Anthropic, or any OpenAI-compatible endpoint).

All data — profile, resumes, snippets, API key — lives in `chrome.storage.local`. Nothing is uploaded to any server except the LLM provider you configure (and only when you click "Draft with AI").

## Install

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select the `job-autofill/` folder.
4. The options page opens automatically the first time. Fill out:
   - **Profile** — name, email, phone, links, work history, education.
   - **Resumes** — upload one or more PDFs/DOCX, tag each (e.g. "Backend", "AI/ML").
   - **AI / API** — pick provider, paste API key, set model (e.g. `gpt-4o-mini` or `claude-haiku-4-5-20251001`). Click **Test connection**.

## Use

1. Open any application page on Greenhouse, Lever, or a Workday tenant (`*.myworkdayjobs.com`).
2. A small **JobFill** panel appears in the bottom-right of the page.
3. Pick the right resume from the dropdown.
4. Click **Autofill form** — name, email, phone, links, location, and EEO fields fill automatically.
5. Click **Attach resume** to upload the selected file to the resume input.
6. For long-answer questions ("Why this company?", cover letter, etc.) a small **Draft with AI** button appears above the textarea. Click it to generate a tailored draft from your profile + the job description. **Always review and edit before submitting.**

You can also use the toolbar popup for the same actions.

## What gets filled automatically

The matcher uses regexes against label, name, placeholder, `aria-label`, `data-automation-id`, and `autocomplete` attributes to map fields to your profile:

- First / last / full name, email, phone
- LinkedIn, GitHub, portfolio, Twitter
- City, state, country, postal code
- Current company / title (from the most recent work history entry)
- Most recent school / degree / field of study
- Work authorization, sponsorship
- Gender, race/ethnicity, veteran status, disability status (only if you fill them in)

Resume file uploads are wired through `DataTransfer` so they work on hidden file inputs behind styled "Attach" buttons.

## Privacy

- Profile, resumes, snippets, and API keys are stored only in `chrome.storage.local` on your machine.
- The extension makes outbound network calls **only** when you click "Draft with AI" or "Test connection" — and only to the provider you've configured.
- Nothing is sent to any server controlled by this extension's author. (There is no such server.)
- Use **Data → Export all data** to back up; **Clear all data** wipes everything.

## File layout

```
job-autofill/
├── manifest.json              # MV3 manifest
├── background/
│   └── service_worker.js      # routes openOptions, install hook
├── popup/
│   ├── popup.html / .css / .js  # toolbar popup
├── options/
│   ├── options.html / .css / .js  # full settings page
├── content/
│   ├── content.js             # orchestrator: detects ATS, renders panel
│   ├── content.css            # in-page panel + AI button styles
│   └── adapters/
│       ├── greenhouse.js
│       ├── lever.js
│       └── workday.js
├── lib/
│   ├── storage.js             # chrome.storage wrapper
│   ├── llm.js                 # OpenAI / Anthropic / custom
│   ├── parser.js              # job context extraction
│   └── matcher.js             # field detection + value setting
└── icons/                     # 16/32/48/128
```

## Caveats

- **Workday** is a moving target. Single-page navigation, custom widgets, and per-tenant theming mean some fields won't be detected. The autofill is best-effort; check every page before submitting.
- **Greenhouse / Lever embedded boards** (when a company embeds the form on their own site via iframe) usually work because the content script runs in all frames.
- The AI-draft prompt is intentionally conservative: it tells the model to use only facts from your profile and to leave a `[bracketed placeholder]` rather than make things up. You should still review every draft.
- API keys live in `chrome.storage.local`. They are not encrypted at rest beyond what Chrome provides for that store. Don't install on a shared machine.

## Extending

To add another ATS, drop a new file under `content/adapters/` exporting `name()`, `detect()`, `findResumeInput()`, and (optionally) `findCoverLetterTextarea()`. Register the path in `manifest.json` `content_scripts.js` and add the host to `host_permissions` and `matches`.
