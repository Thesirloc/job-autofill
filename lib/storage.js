/* JobFill — chrome.storage wrapper
 * Profile, resumes, settings, and answer snippets all live in chrome.storage.local.
 * Resume files are stored as base64 strings so they can survive service-worker restarts.
 */
(function () {
  const KEY = "jobfill_v1";

  const DEFAULTS = {
    profile: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: { city: "", state: "", country: "", postal: "" },
      links: { linkedin: "", github: "", portfolio: "", twitter: "" },
      workAuth: { authorized: "", sponsorship: "" }, // "Yes"/"No"
      demographics: { gender: "", race: "", veteran: "", disability: "" },
      summary: "",
      workHistory: [], // [{company, title, start, end, description}]
      education: [],   // [{school, degree, field, start, end}]
      skills: [],
    },
    resumes: [],   // [{id, name, tag, mime, dataBase64, sizeKB, uploadedAt}]
    snippets: [],  // [{id, label, text}]  e.g. "Why this company" boilerplate
    settings: {
      llmProvider: "openai", // "openai" | "anthropic" | "custom"
      llmApiKey: "",
      llmModel: "gpt-4o-mini",
      llmEndpoint: "", // for "custom" OpenAI-compatible
      askBeforeAI: true,
      preferredResumeId: null,
    },
    history: [], // [{url, host, ts, fieldsFilled, resumeId}]
  };

  async function getAll() {
    const data = await chrome.storage.local.get(KEY);
    const stored = data[KEY] || {};
    return deepMerge(structuredClone(DEFAULTS), stored);
  }

  async function setAll(value) {
    await chrome.storage.local.set({ [KEY]: value });
    return value;
  }

  async function update(mutator) {
    const current = await getAll();
    const next = await mutator(current);
    await setAll(next || current);
    return current;
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    for (const k of Object.keys(source)) {
      const sv = source[k];
      const tv = target[k];
      if (Array.isArray(sv)) {
        target[k] = sv;
      } else if (sv && typeof sv === "object" && tv && typeof tv === "object" && !Array.isArray(tv)) {
        target[k] = deepMerge(tv, sv);
      } else if (sv !== undefined) {
        target[k] = sv;
      }
    }
    return target;
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // expose
  const api = { getAll, setAll, update, uid, DEFAULTS };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    // attach to global for content scripts / popup / options
    self.JobFillStorage = api;
  }
})();
