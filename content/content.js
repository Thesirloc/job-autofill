/* JobFill — main content script (orchestrator)
 *
 * Responsibilities:
 *   1) Detect the current ATS via adapters.
 *   2) Render an in-page floating panel ("JobFill") with: pick resume, autofill,
 *      attach resume, draft answer.
 *   3) Map each detected input to a profile field via JobFillMatcher and fill it.
 *   4) For long free-text questions, expose a "Draft with AI" link that calls the
 *      configured LLM with profile + JD context.
 *
 * Talks to background only via chrome.runtime for "openOptions" + "log".
 */
(function () {
  const STORAGE = self.JobFillStorage;
  const MATCHER = self.JobFillMatcher;
  const PARSER = self.JobFillParser;
  const LLM = self.JobFillLLM;
  const ADAPTERS = self.JobFillAdapters || {};

  function pickAdapter() {
    for (const a of Object.values(ADAPTERS)) {
      try { if (a.detect()) return a; } catch (_) {}
    }
    return null;
  }

  const adapter = pickAdapter();
  if (!adapter) return; // not on a known ATS form
  if (window.top !== window && !looksLikeFormFrame()) {
    // Workday loads stuff in iframes; only init if this frame has form fields
    return;
  }

  function looksLikeFormFrame() {
    return !!document.querySelector("input, textarea, select, form");
  }

  let panelEl = null;
  let lastReport = null;

  init().catch((e) => console.warn("[JobFill] init failed", e));

  async function init() {
    await waitForForm();
    renderPanel();
    observeNewFields();
  }

  function waitForForm() {
    return new Promise((resolve) => {
      if (document.querySelector("input, textarea, select")) return resolve();
      const obs = new MutationObserver(() => {
        if (document.querySelector("input, textarea, select")) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(); }, 5000);
    });
  }

  function observeNewFields() {
    const obs = new MutationObserver(() => decorateFreeText());
    obs.observe(document.body, { childList: true, subtree: true });
    decorateFreeText();
  }

  /* ---------------- UI ---------------- */

  function renderPanel() {
    if (panelEl) return;
    panelEl = document.createElement("div");
    panelEl.id = "jobfill-panel";
    panelEl.innerHTML = `
      <div class="jf-header">
        <span class="jf-logo">JobFill</span>
        <span class="jf-ats">${adapter.name()}</span>
        <button class="jf-x" title="Hide">×</button>
      </div>
      <div class="jf-body">
        <label class="jf-row">
          <span>Resume</span>
          <select class="jf-resume"></select>
        </label>
        <div class="jf-actions">
          <button class="jf-btn jf-fill" title="Fill all standard fields">Autofill form</button>
          <button class="jf-btn jf-attach" title="Attach selected resume">Attach resume</button>
        </div>
        <div class="jf-status"></div>
      </div>
      <div class="jf-footer">
        <a href="#" class="jf-options">Edit profile / settings</a>
      </div>
    `;
    document.body.appendChild(panelEl);

    panelEl.querySelector(".jf-x").addEventListener("click", () => panelEl.classList.toggle("jf-collapsed"));
    panelEl.querySelector(".jf-fill").addEventListener("click", onAutofill);
    panelEl.querySelector(".jf-attach").addEventListener("click", onAttachResume);
    panelEl.querySelector(".jf-options").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "openOptions" });
    });

    populateResumes();
  }

  async function populateResumes() {
    const sel = panelEl.querySelector(".jf-resume");
    const data = await STORAGE.getAll();
    sel.innerHTML = "";
    if (!data.resumes.length) {
      const opt = document.createElement("option");
      opt.textContent = "(no resumes — open settings)";
      opt.value = "";
      sel.appendChild(opt);
      return;
    }
    for (const r of data.resumes) {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.tag ? `${r.tag} — ${r.name}` : r.name;
      if (data.settings.preferredResumeId === r.id) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function setStatus(msg, kind = "info") {
    const el = panelEl?.querySelector(".jf-status");
    if (!el) return;
    el.textContent = msg;
    el.className = "jf-status jf-" + kind;
  }

  /* ---------------- Autofill ---------------- */

  async function onAutofill() {
    const data = await STORAGE.getAll();
    const profile = data.profile;
    if (!profile.email && !profile.firstName) {
      setStatus("Add your profile in settings first.", "warn");
      return;
    }
    const inputs = MATCHER.findFillableInputs();
    let filled = 0;
    let skipped = 0;
    for (const el of inputs) {
      const key = MATCHER.getFieldKey(el);
      if (!key) { skipped++; continue; }
      const val = profileValue(profile, key);
      if (val == null || val === "") { skipped++; continue; }
      const ok = MATCHER.setFieldValue(el, val);
      if (ok) filled++;
    }
    decorateFreeText();
    lastReport = { filled, skipped, total: inputs.length };
    setStatus(`Filled ${filled} of ${inputs.length} fields. Review long-answer questions below.`, "ok");
    await STORAGE.update((d) => {
      d.history.unshift({
        url: location.href,
        host: location.host,
        ts: Date.now(),
        fieldsFilled: filled,
        resumeId: panelEl.querySelector(".jf-resume").value || null,
      });
      d.history = d.history.slice(0, 50);
      return d;
    });
  }

  function profileValue(p, key) {
    switch (key) {
      case "firstName": return p.firstName;
      case "lastName": return p.lastName;
      case "fullName": return [p.firstName, p.lastName].filter(Boolean).join(" ");
      case "email": return p.email;
      case "phone": return p.phone;
      case "linkedin": return p.links?.linkedin;
      case "github": return p.links?.github;
      case "portfolio": return p.links?.portfolio;
      case "twitter": return p.links?.twitter;
      case "city": return p.address?.city;
      case "state": return p.address?.state;
      case "country": return p.address?.country;
      case "postal": return p.address?.postal;
      case "company": return p.workHistory?.[0]?.company;
      case "title": return p.workHistory?.[0]?.title;
      case "school": return p.education?.[0]?.school;
      case "degree": return p.education?.[0]?.degree;
      case "major": return p.education?.[0]?.field;
      case "workAuthorized": return p.workAuth?.authorized;
      case "sponsorship": return p.workAuth?.sponsorship;
      case "gender": return p.demographics?.gender;
      case "race": return p.demographics?.race;
      case "veteran": return p.demographics?.veteran;
      case "disability": return p.demographics?.disability;
      case "summary": return p.summary;
      default: return null;
    }
  }

  /* ---------------- Resume attach ---------------- */

  async function onAttachResume() {
    const sel = panelEl.querySelector(".jf-resume");
    const id = sel.value;
    if (!id) {
      setStatus("Pick a resume to attach.", "warn");
      return;
    }
    const data = await STORAGE.getAll();
    const resume = data.resumes.find((r) => r.id === id);
    if (!resume) { setStatus("Resume not found.", "warn"); return; }
    const input = adapter.findResumeInput?.();
    if (!input) { setStatus("Couldn't find a resume upload field on this page.", "warn"); return; }
    const ok = MATCHER.attachResumeFile(input, resume);
    setStatus(ok ? `Attached ${resume.name}.` : "Failed to attach. Try uploading manually.", ok ? "ok" : "warn");
    if (ok) {
      await STORAGE.update((d) => { d.settings.preferredResumeId = id; return d; });
    }
  }

  /* ---------------- AI drafting for long-answer fields ---------------- */

  function decorateFreeText() {
    const fields = MATCHER.findFillableInputs().filter(MATCHER.isLongFreeText);
    for (const t of fields) {
      if (t.dataset.jobfillDecorated) continue;
      t.dataset.jobfillDecorated = "1";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jf-ai-btn";
      btn.textContent = "Draft with AI";
      btn.addEventListener("click", () => draftAnswer(t, btn));
      try {
        t.parentElement?.insertBefore(btn, t);
      } catch (_) {
        document.body.appendChild(btn);
      }
    }
  }

  async function draftAnswer(textarea, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Drafting…";
    try {
      const data = await STORAGE.getAll();
      const profile = data.profile;
      const context = PARSER.getJobContext();
      const question = MATCHER.describeField(textarea) || "(no label)";
      const snippetsText = (data.snippets || [])
        .map((s) => `- ${s.label}: ${s.text}`).join("\n");
      const profileText = JSON.stringify(profile, null, 2);

      const system = "You are helping a candidate draft a job application answer. " +
        "Write in the candidate's voice: clear, specific, no clichés or em-dashes, no AI tells. " +
        "Use facts only from the candidate's profile. If the question can't be answered from the profile, " +
        "leave a single bracketed placeholder like [add example here]. Keep length appropriate for the question.";

      const user =
        `JOB CONTEXT\nCompany: ${context.company}\nTitle: ${context.title}\nLocation: ${context.jobLocation}\n` +
        `Description: ${context.description.slice(0, 1500)}\n\n` +
        `CANDIDATE PROFILE (JSON)\n${profileText}\n\n` +
        `REUSABLE SNIPPETS\n${snippetsText || "(none)"}\n\n` +
        `QUESTION FIELD\n${question}\n\n` +
        `Write the answer text only — no preamble, no quotes.`;

      const draft = await LLM.chat({ system, user, temperature: 0.5, maxTokens: 600 });
      MATCHER.setFieldValue(textarea, draft.trim());
      btn.textContent = "Re-draft";
    } catch (e) {
      console.error("[JobFill] draft failed", e);
      alert("JobFill: draft failed — " + (e?.message || e));
      btn.textContent = original;
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------------- Messages from popup ---------------- */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "jobfill:autofill") { onAutofill().then(() => sendResponse({ ok: true, report: lastReport })); return true; }
    if (msg?.type === "jobfill:attach")   { onAttachResume().then(() => sendResponse({ ok: true })); return true; }
    if (msg?.type === "jobfill:context")  {
      sendResponse({ adapter: adapter.name(), context: PARSER.getJobContext() });
      return false;
    }
  });
})();
