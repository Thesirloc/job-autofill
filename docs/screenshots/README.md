# Web Store screenshots

Five 1280×800 self-contained HTML demos for the Chrome Web Store listing. They mock the extension's UI so you don't need to install or run JobFill on a real ATS to capture clean shots.

## Files

| # | File | Story it tells |
|---|---|---|
| 1 | `01-hero-greenhouse-autofill.html` | Hero shot — Greenhouse application with personal info + profile sections autofilled, JobFill panel showing "✓ Filled 14 of 14 fields". |
| 2 | `02-lever-on-page-panel.html` | Lever application with resume attached and form populated, JobFill panel showing "✓ Resume attached · 8 fields filled". |
| 3 | `03-draft-with-ai.html` | The differentiated AI feature — open-ended question with the new instructions input pre-filled and a high-quality draft in the textarea (one `[add specific example]` placeholder visible to prove the no-invention rule). |
| 4 | `04-options-profile.html` | Options page Profile tab, fully populated (identity, links, summary, two work-history entries). |
| 5 | `05-options-ai-gemini.html` | Options page AI / API tab with Google Gemini selected, "OK — Gemini responded." test result, and a callout for the free tier. |

## How to capture

1. Open the file in Chrome: `file:///D:/WorkWithClaude/job-autofill/docs/screenshots/01-...html` (or whichever).
2. Open DevTools (`F12`) → toggle device toolbar (`Ctrl+Shift+M`) → set dimensions to **1280 × 800**, scale **100 %**.
3. DevTools menu (⋮ in the top-right of DevTools) → **Capture screenshot**. The PNG downloads at exactly 1280×800.
4. Repeat for each file.

Alternative: in any browser at 1280-wide, use Win+Shift+S to capture the visible 800px region. Less precise but fine for review.

## Replacing the fake data

All five files use the placeholder identity "Sushant Singh / sushant@example.com / Lumen / Acme Robotics / Nexus Labs". Find-and-replace those across the directory if you want different fake data — none of it is loaded from the actual extension storage, so editing the HTML is the only way to change the rendered values.

## Why these are HTML mocks, not real captures

JobFill only injects its UI on Greenhouse / Lever / Workday hosts (until dynamic whitelisting ships). Capturing an authentic screenshot would require a public ATS posting that stays live and a profile populated with non-fake data — both fragile and time-consuming. These mocks reproduce the exact `#jobfill-panel`, `.jf-ai-wrap`, and `.jf-ai-btn` markup and CSS from `content/content.css` and `options/options.css`, so the visual is faithful.

If `content/content.css` changes meaningfully, sync the inline `<style>` blocks in shots 1–3 (the JobFill UI sections) so future re-captures stay accurate.
