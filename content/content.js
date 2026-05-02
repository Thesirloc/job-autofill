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

      const wrap = document.createElement("div");
      wrap.className = "jf-ai-wrap";

      const instr = document.createElement("input");
      instr.type = "text";
      instr.className = "jf-ai-instructions";
      instr.placeholder = "Optional: extra instructions (e.g. mention my X project)";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jf-ai-btn";
      btn.textContent = "Draft with AI";
      btn.addEventListener("click", () => draftAnswer(t, btn, instr.value.trim()));

      instr.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          btn.click();
        }
      });

      wrap.appendChild(instr);
      wrap.appendChild(btn);

      try {
        t.parentElement?.insertBefore(wrap, t);
      } catch (_) {
        document.body.appendChild(wrap);
      }
    }
  }

  async function draftAnswer(textarea, btn, userInstructions) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Drafting…";
    try {
      const data = await STORAGE.getAll();
      const profile = data.profile;
      const context = PARSER.getJobContext();
      const question = MATCHER.describeField(textarea) || "(no label)";

      const shape = classifyQuestion(question, textarea);
      const profileSummary = buildProfileSummary(profile, context);
      const matchedSnippet = pickRelevantSnippet(data.snippets || [], question);

      const system =
        "You draft job-application answers in the candidate's first-person voice. " +
        "Hard rules:\n" +
        "1. Use ONLY facts present in the candidate profile below. Never invent a project, role, metric, school, or skill.\n" +
        "2. If a fact you need is missing, write `[add specific example]` exactly once and continue.\n" +
        "3. Lead with a concrete project, role, or accomplishment from the profile — not a generic statement of interest.\n" +
        "4. Cite at least one of: company name, project name, technology, or measurable outcome from the profile.\n" +
        "5. Tie the answer to this specific role: reference the company name, the title, or a requirement from the JD.\n" +
        "6. Plain prose. No bullet lists unless the question asks for them. No headings. No em-dashes. No 'I am excited to', 'passionate about', 'thrilled', 'leverage', 'synergy', 'cutting-edge'. No closing sign-off.\n" +
        `7. Length: ${shape.lengthGuidance}. Stop when you've made the point — do not pad.\n` +
        "8. If a USER INSTRUCTIONS block is present, treat it as the highest-priority spec for THIS answer — it overrides the inferred question type, length guidance, and structure suggestions, BUT it never overrides rule 1 (no invention).";

      const user =
        `JOB\n` +
        `Company: ${context.company || "(unknown)"}\n` +
        `Title: ${context.title || "(unknown)"}\n` +
        (context.jobLocation ? `Location: ${context.jobLocation}\n` : "") +
        `JD excerpt:\n${(context.description || "(none)").slice(0, 1800)}\n\n` +
        `CANDIDATE PROFILE\n${profileSummary}\n\n` +
        (matchedSnippet
          ? `CANDIDATE'S OWN PRIOR ANSWER (use as voice + content reference, rewrite for this role):\n${matchedSnippet}\n\n`
          : "") +
        (userInstructions
          ? `USER INSTRUCTIONS (highest priority — follow literally, but do not invent facts):\n${userInstructions}\n\n`
          : "") +
        `QUESTION (label / attributes from the form): ${question}\n` +
        `INFERRED QUESTION TYPE: ${shape.type}\n\n` +
        `Write the answer text only. No preamble, no quotes, no signature.`;

      const draft = await LLM.chat({
        system,
        user,
        temperature: 0.25,
        maxTokens: shape.maxTokens,
      });
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

  /* ---------- prompt helpers ---------- */

  function classifyQuestion(label, textarea) {
    const l = (label || "").toLowerCase();
    const maxLen = parseInt(textarea.getAttribute("maxlength") || "0", 10);
    const rows = parseInt(textarea.getAttribute("rows") || "0", 10);

    if (/yes\/?no|are you|do you|have you|will you|can you/i.test(l) && (maxLen && maxLen < 50)) {
      return { type: "yes/no", lengthGuidance: "one word: Yes or No", maxTokens: 10 };
    }
    if (maxLen && maxLen <= 250) {
      return { type: "one-sentence", lengthGuidance: `1 sentence, max ${maxLen} characters`, maxTokens: 120 };
    }
    if (/cover\s*letter/.test(l)) {
      return { type: "cover letter", lengthGuidance: "3 short paragraphs (~180–240 words total). Hook, fit, close.", maxTokens: 500 };
    }
    if (/why.*(this|us|company|role|join|interested)/.test(l) || /interest/.test(l)) {
      return { type: "why this company/role", lengthGuidance: "2 short paragraphs (~110–160 words). First: a specific thing about THIS company/role from the JD that draws you. Second: the most relevant project from your profile that proves fit.", maxTokens: 350 };
    }
    if (/proud|accomplish|achievement|impact|biggest/.test(l)) {
      return { type: "accomplishment story", lengthGuidance: "1 paragraph (~110–150 words) using situation→action→outcome. Name a metric.", maxTokens: 320 };
    }
    if (/tell us about|describe yourself|background|introduce/.test(l)) {
      return { type: "self-intro", lengthGuidance: "3–4 sentences (~80–120 words). Current role, 1–2 signature projects, why this kind of role next.", maxTokens: 260 };
    }
    if (/challenge|difficult|hardest|problem|conflict|failure|mistake/.test(l)) {
      return { type: "STAR story", lengthGuidance: "1 paragraph (~120–160 words). Situation, action, outcome. Be honest about the difficulty.", maxTokens: 340 };
    }
    if (/strength|weakness/.test(l)) {
      return { type: "strength/weakness", lengthGuidance: "3–4 sentences (~70–100 words) grounded in a real example from the profile.", maxTokens: 220 };
    }
    if (/salary|compensation|expect/.test(l)) {
      return { type: "compensation", lengthGuidance: "One short sentence. If no preference is in the profile, write `[your target range]`.", maxTokens: 60 };
    }
    if (/availability|notice|start\s*date/.test(l)) {
      return { type: "availability", lengthGuidance: "One short sentence.", maxTokens: 50 };
    }
    if (rows >= 8 || (maxLen && maxLen >= 1500)) {
      return { type: "long essay", lengthGuidance: "3–4 paragraphs (~250–350 words). Specific, structured, not flowery.", maxTokens: 700 };
    }
    return { type: "open-ended paragraph", lengthGuidance: "1–2 paragraphs (~100–150 words). Specific, not generic.", maxTokens: 320 };
  }

  function buildProfileSummary(p, ctx) {
    const lines = [];
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
    if (fullName) lines.push(`Name: ${fullName}`);
    if (p.summary) lines.push(`Summary: ${p.summary}`);
    if (p.skills?.length) lines.push(`Skills: ${p.skills.join(", ")}`);

    const jdText = ((ctx.description || "") + " " + (ctx.title || "")).toLowerCase();
    const ranked = (p.workHistory || [])
      .map((w, i) => ({ w, i, score: scoreWorkRelevance(w, jdText) }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 3)
      .map(({ w }) => w);

    if (ranked.length) {
      lines.push("\nMost relevant roles (use these as the source of stories):");
      for (const w of ranked) {
        const range = [w.start, w.end].filter(Boolean).join("–");
        lines.push(`  • ${w.title || "(role)"} at ${w.company || "(company)"}${range ? ` (${range})` : ""}`);
        if (w.description) {
          const trimmed = w.description.replace(/\s+/g, " ").trim().slice(0, 500);
          lines.push(`    ${trimmed}`);
        }
      }
    }

    if (p.education?.length) {
      const e = p.education[0];
      const ed = [e.degree, e.field, e.school].filter(Boolean).join(", ");
      if (ed) lines.push(`\nEducation: ${ed}`);
    }

    return lines.join("\n");
  }

  function scoreWorkRelevance(work, jdText) {
    const haystack = ((work.title || "") + " " + (work.description || "")).toLowerCase();
    const tokens = haystack.split(/[^a-z0-9+#.]+/).filter((t) => t.length > 3);
    let score = 0;
    const seen = new Set();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (jdText.includes(t)) score++;
    }
    return score;
  }

  function pickRelevantSnippet(snippets, question) {
    if (!snippets.length) return null;
    const q = (question || "").toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const s of snippets) {
      const label = (s.label || "").toLowerCase();
      if (!label) continue;
      const tokens = label.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const score = tokens.reduce((acc, t) => acc + (q.includes(t) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best && bestScore > 0 ? best.text : null;
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
