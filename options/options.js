/* JobFill — options page */
const STORAGE = self.JobFillStorage;

let state = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  state = await STORAGE.getAll();
  initTabs();
  bindProfile();
  bindResumes();
  bindSnippets();
  bindAI();
  bindData();
  renderAll();
}

/* ---------- Tabs ---------- */
function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

/* ---------- Profile ---------- */
function bindProfile() {
  document.getElementById("save-profile").addEventListener("click", saveProfile);
  document.getElementById("add-work").addEventListener("click", () => {
    state.profile.workHistory.push({ company: "", title: "", start: "", end: "", description: "" });
    renderWork();
  });
  document.getElementById("add-edu").addEventListener("click", () => {
    state.profile.education.push({ school: "", degree: "", field: "", start: "", end: "" });
    renderEdu();
  });
}

function renderProfile() {
  const p = state.profile;
  set("firstName", p.firstName); set("lastName", p.lastName);
  set("email", p.email); set("phone", p.phone);
  set("city", p.address.city); set("state", p.address.state);
  set("country", p.address.country); set("postal", p.address.postal);
  set("linkedin", p.links.linkedin); set("github", p.links.github);
  set("portfolio", p.links.portfolio); set("twitter", p.links.twitter);
  set("authorized", p.workAuth.authorized); set("sponsorship", p.workAuth.sponsorship);
  set("gender", p.demographics.gender); set("race", p.demographics.race);
  set("veteran", p.demographics.veteran); set("disability", p.demographics.disability);
  set("summary", p.summary);
  set("skills", (p.skills || []).join(", "));
  renderWork();
  renderEdu();
}

function renderWork() {
  const wrap = document.getElementById("work-list");
  wrap.innerHTML = "";
  state.profile.workHistory.forEach((w, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <button class="remove" data-i="${i}">remove</button>
      <div class="row">
        <label>Company <input data-k="company" value="${esc(w.company)}" /></label>
        <label>Title <input data-k="title" value="${esc(w.title)}" /></label>
        <label>Start <input data-k="start" value="${esc(w.start)}" placeholder="YYYY-MM" /></label>
        <label>End <input data-k="end" value="${esc(w.end)}" placeholder="YYYY-MM or Present" /></label>
      </div>
      <textarea data-k="description" rows="2" placeholder="Brief description / accomplishments">${esc(w.description)}</textarea>
    `;
    div.addEventListener("input", (e) => {
      const k = e.target.dataset.k; if (!k) return;
      state.profile.workHistory[i][k] = e.target.value;
    });
    div.querySelector(".remove").addEventListener("click", () => {
      state.profile.workHistory.splice(i, 1); renderWork();
    });
    wrap.appendChild(div);
  });
}

function renderEdu() {
  const wrap = document.getElementById("edu-list");
  wrap.innerHTML = "";
  state.profile.education.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <button class="remove" data-i="${i}">remove</button>
      <div class="row">
        <label>School <input data-k="school" value="${esc(e.school)}" /></label>
        <label>Degree <input data-k="degree" value="${esc(e.degree)}" /></label>
        <label>Field <input data-k="field" value="${esc(e.field)}" /></label>
        <label>Years <input data-k="start" value="${esc(e.start)}" placeholder="YYYY–YYYY" /></label>
      </div>
    `;
    div.addEventListener("input", (ev) => {
      const k = ev.target.dataset.k; if (!k) return;
      state.profile.education[i][k] = ev.target.value;
    });
    div.querySelector(".remove").addEventListener("click", () => {
      state.profile.education.splice(i, 1); renderEdu();
    });
    wrap.appendChild(div);
  });
}

async function saveProfile() {
  const p = state.profile;
  p.firstName = val("firstName"); p.lastName = val("lastName");
  p.email = val("email"); p.phone = val("phone");
  p.address = { city: val("city"), state: val("state"), country: val("country"), postal: val("postal") };
  p.links = { linkedin: val("linkedin"), github: val("github"), portfolio: val("portfolio"), twitter: val("twitter") };
  p.workAuth = { authorized: val("authorized"), sponsorship: val("sponsorship") };
  p.demographics = { gender: val("gender"), race: val("race"), veteran: val("veteran"), disability: val("disability") };
  p.summary = val("summary");
  p.skills = val("skills").split(",").map((s) => s.trim()).filter(Boolean);
  await STORAGE.setAll(state);
  flash("profile-saved", "Saved");
}

/* ---------- Resumes ---------- */
function bindResumes() {
  document.getElementById("resume-upload").addEventListener("click", uploadResume);
}

async function uploadResume() {
  const file = document.getElementById("resume-file").files?.[0];
  if (!file) { alert("Choose a file first."); return; }
  if (file.size > 5 * 1024 * 1024) { alert("Resume must be under 5 MB."); return; }
  const tag = document.getElementById("resume-tag").value.trim();
  const dataBase64 = await fileToBase64(file);
  state.resumes.push({
    id: STORAGE.uid(),
    name: file.name,
    tag,
    mime: file.type || "application/pdf",
    dataBase64,
    sizeKB: Math.round(file.size / 1024),
    uploadedAt: Date.now(),
  });
  await STORAGE.setAll(state);
  document.getElementById("resume-file").value = "";
  document.getElementById("resume-tag").value = "";
  renderResumes();
}

function renderResumes() {
  const wrap = document.getElementById("resume-list");
  wrap.innerHTML = "";
  if (!state.resumes.length) {
    wrap.innerHTML = '<p class="hint">No resumes uploaded yet.</p>';
    return;
  }
  state.resumes.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "resume-row";
    row.innerHTML = `
      <span class="name">${esc(r.name)}</span>
      ${r.tag ? `<span class="tag">${esc(r.tag)}</span>` : ""}
      <span class="muted small">${r.sizeKB} KB</span>
      <button data-i="${i}">remove</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      state.resumes.splice(i, 1);
      await STORAGE.setAll(state);
      renderResumes();
    });
    wrap.appendChild(row);
  });
}

/* ---------- Snippets ---------- */
function bindSnippets() {
  document.getElementById("add-snippet").addEventListener("click", () => {
    state.snippets.push({ id: STORAGE.uid(), label: "", text: "" });
    renderSnippets();
  });
  document.getElementById("save-snippets").addEventListener("click", async () => {
    await STORAGE.setAll(state);
    flash("snippets-saved", "Saved");
  });
}

function renderSnippets() {
  const wrap = document.getElementById("snippet-list");
  wrap.innerHTML = "";
  state.snippets.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "snippet-row";
    row.innerHTML = `
      <input data-k="label" placeholder="Label (e.g. Why this company)" value="${esc(s.label)}" />
      <textarea data-k="text" placeholder="Snippet text...">${esc(s.text)}</textarea>
      <button data-i="${i}">remove</button>
    `;
    row.addEventListener("input", (e) => {
      const k = e.target.dataset.k; if (!k) return;
      state.snippets[i][k] = e.target.value;
    });
    row.querySelector("button").addEventListener("click", () => {
      state.snippets.splice(i, 1); renderSnippets();
    });
    wrap.appendChild(row);
  });
}

/* ---------- AI ---------- */
function bindAI() {
  document.getElementById("llm-provider").addEventListener("change", () => {
    document.getElementById("custom-endpoint-row").style.display =
      document.getElementById("llm-provider").value === "custom" ? "" : "none";
  });
  document.getElementById("save-ai").addEventListener("click", async () => {
    state.settings.llmProvider = val("llm-provider");
    state.settings.llmModel = val("llm-model");
    state.settings.llmApiKey = val("llm-api-key");
    state.settings.llmEndpoint = val("llm-endpoint");
    await STORAGE.setAll(state);
    flash("ai-saved", "Saved");
  });
  document.getElementById("test-ai").addEventListener("click", testAI);
}

function renderAI() {
  set("llm-provider", state.settings.llmProvider);
  set("llm-model", state.settings.llmModel);
  set("llm-api-key", state.settings.llmApiKey);
  set("llm-endpoint", state.settings.llmEndpoint);
  document.getElementById("custom-endpoint-row").style.display =
    state.settings.llmProvider === "custom" ? "" : "none";
}

async function testAI() {
  const out = document.getElementById("ai-test-out");
  out.textContent = "Testing…";
  // Save first so the LLM lib reads fresh values
  state.settings.llmProvider = val("llm-provider");
  state.settings.llmModel = val("llm-model");
  state.settings.llmApiKey = val("llm-api-key");
  state.settings.llmEndpoint = val("llm-endpoint");
  await STORAGE.setAll(state);

  // Inline minimal LLM call (we can't import lib/llm.js as a module from the options page,
  // so we duplicate the "is the key valid" probe.)
  try {
    const provider = state.settings.llmProvider;
    if (!state.settings.llmApiKey) throw new Error("Add an API key first.");
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": state.settings.llmApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: state.settings.llmModel || "claude-haiku-4-5-20251001",
          max_tokens: 20,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
        }),
      });
      out.textContent = r.ok ? "OK — Anthropic responded." : `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } else if (provider === "gemini") {
      const model = state.settings.llmModel || "gemini-2.5-flash";
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(state.settings.llmApiKey);
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
          generationConfig: { maxOutputTokens: 20, temperature: 0 },
        }),
      });
      out.textContent = r.ok ? "OK — Gemini responded." : `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } else {
      const endpoint = provider === "custom" && state.settings.llmEndpoint
        ? state.settings.llmEndpoint.replace(/\/+$/, "") + "/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.settings.llmApiKey}` },
        body: JSON.stringify({
          model: state.settings.llmModel || "gpt-4o-mini",
          max_tokens: 20,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
        }),
      });
      out.textContent = r.ok ? "OK — provider responded." : `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
    }
  } catch (e) {
    out.textContent = "Error: " + (e?.message || e);
  }
}

/* ---------- Data ---------- */
function bindData() {
  document.getElementById("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "jobfill-backup.json"; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    try {
      const next = JSON.parse(text);
      state = next;
      await STORAGE.setAll(state);
      renderAll();
      alert("Imported.");
    } catch (err) { alert("Invalid backup file."); }
  });
  document.getElementById("clear").addEventListener("click", async () => {
    if (!confirm("Erase all JobFill data? This cannot be undone.")) return;
    await chrome.storage.local.clear();
    state = await STORAGE.getAll();
    renderAll();
  });
}

function renderHistory() {
  const wrap = document.getElementById("history");
  wrap.innerHTML = "";
  if (!state.history?.length) { wrap.innerHTML = '<p class="hint">No applications yet.</p>'; return; }
  for (const h of state.history) {
    const row = document.createElement("div");
    row.className = "history-row";
    const date = new Date(h.ts).toLocaleString();
    row.innerHTML = `
      <span class="name">${esc(h.host)} <span class="muted small">${esc(h.url)}</span></span>
      <span class="muted small">${esc(date)} · ${h.fieldsFilled} fields</span>
    `;
    wrap.appendChild(row);
  }
}

/* ---------- helpers ---------- */
function renderAll() { renderProfile(); renderResumes(); renderSnippets(); renderAI(); renderHistory(); }
function set(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ""; }
function val(id) { const el = document.getElementById(id); return (el?.value ?? "").trim(); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
function flash(id, text) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = text;
  setTimeout(() => { el.textContent = ""; }, 1500);
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
