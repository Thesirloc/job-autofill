/* JobFill — popup */
const STORAGE = self.JobFillStorage;

const els = {
  status: document.getElementById("status"),
  ats: document.getElementById("ats-badge"),
  jobContext: document.getElementById("job-context"),
  resume: document.getElementById("resume-select"),
  fill: document.getElementById("btn-fill"),
  attach: document.getElementById("btn-attach"),
  msg: document.getElementById("msg"),
  options: document.getElementById("open-options"),
};

(async function init() {
  await populateResumes();
  els.options.addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  els.fill.addEventListener("click", () => sendToTab({ type: "jobfill:autofill" }, "Filled fields. Open the page to review."));
  els.attach.addEventListener("click", async () => {
    const id = els.resume.value;
    if (id) await STORAGE.update((d) => { d.settings.preferredResumeId = id; return d; });
    sendToTab({ type: "jobfill:attach" }, "Attached resume.");
  });

  const tab = await activeTab();
  if (!tab) {
    setStatus("No active tab.", "warn");
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "jobfill:context" }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      els.ats.textContent = "Not detected";
      setStatus("This isn't a recognized application page (Greenhouse, Lever, Workday).", "warn");
      els.fill.disabled = true;
      els.attach.disabled = true;
      return;
    }
    els.ats.textContent = resp.adapter;
    setStatus("Ready. Click Autofill to populate standard fields.");
    const c = resp.context;
    if (c?.title || c?.company) {
      els.jobContext.textContent = [c.title, c.company].filter(Boolean).join(" @ ");
    }
  });
})();

async function populateResumes() {
  const data = await STORAGE.getAll();
  els.resume.innerHTML = "";
  if (!data.resumes.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no resumes — open settings)";
    els.resume.appendChild(opt);
    els.attach.disabled = true;
    return;
  }
  for (const r of data.resumes) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.tag ? `${r.tag} — ${r.name}` : r.name;
    if (data.settings.preferredResumeId === r.id) opt.selected = true;
    els.resume.appendChild(opt);
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToTab(msg, okText) {
  const tab = await activeTab();
  if (!tab) return setStatus("No tab.", "warn");
  chrome.tabs.sendMessage(tab.id, msg, (resp) => {
    if (chrome.runtime.lastError) {
      setMsg("Page not ready. Reload the application page and try again.", "warn");
      return;
    }
    setMsg(okText, "ok");
  });
}

function setStatus(t, k) { els.status.textContent = t; els.status.className = k || ""; }
function setMsg(t, k) { els.msg.textContent = t; els.msg.className = "msg " + (k || ""); }
