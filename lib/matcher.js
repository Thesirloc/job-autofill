/* JobFill — generic field detection + value setting
 *
 * setFieldValue() fires both native setter and React's onChange path,
 * so values stick in React/Vue/Workday-style controlled inputs.
 */
(function () {
  // Map "logical key" → list of regex patterns matched against label/name/placeholder/aria-label.
  const FIELD_PATTERNS = {
    firstName: [/first\s*name/i, /given\s*name/i, /\bfname\b/i, /^first$/i],
    lastName: [/last\s*name/i, /family\s*name/i, /surname/i, /\blname\b/i, /^last$/i],
    fullName: [/^name$/i, /full\s*name/i, /your\s*name/i, /legal\s*name/i],
    email: [/e[-\s]?mail/i],
    phone: [/phone/i, /mobile/i, /telephone/i, /\bcell\b/i],
    linkedin: [/linkedin/i],
    github: [/github/i],
    portfolio: [/portfolio/i, /personal\s*website/i, /website/i, /personal\s*url/i],
    twitter: [/twitter/i, /x\.com/i],
    city: [/(^|\W)city(\W|$)/i],
    state: [/(^|\W)(state|province|region)(\W|$)/i],
    country: [/(^|\W)country(\W|$)/i],
    postal: [/(^|\W)(zip|postal)(\W|$)/i],
    company: [/current\s*company/i, /^company$/i, /employer/i],
    title: [/current\s*title/i, /^title$/i, /role/i, /position/i],
    school: [/school/i, /university/i, /college/i],
    degree: [/degree/i],
    major: [/major/i, /field of study/i, /discipline/i],
    workAuthorized: [/legally\s*authorized/i, /authorized to work/i, /work\s*authorization/i],
    sponsorship: [/require.*sponsorship/i, /need.*sponsorship/i, /visa\s*sponsorship/i],
    gender: [/gender/i],
    race: [/(race|ethnicity)/i],
    veteran: [/veteran/i],
    disability: [/disability/i],
    coverLetter: [/cover\s*letter/i],
    summary: [/summary/i, /tell us about yourself/i, /about you/i],
    pronouns: [/pronoun/i],
    salary: [/salary|compensation expect/i],
    startDate: [/(start|available).*date/i, /availability/i],
  };

  function getFieldKey(el) {
    const ctx = describeField(el);
    for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (patterns.some((re) => re.test(ctx))) return key;
    }
    return null;
  }

  function describeField(el) {
    const bits = [
      el.getAttribute("name"),
      el.getAttribute("id"),
      el.getAttribute("placeholder"),
      el.getAttribute("aria-label"),
      el.getAttribute("data-qa"),
      el.getAttribute("data-automation-id"),
      el.getAttribute("autocomplete"),
      labelTextFor(el),
    ];
    return bits.filter(Boolean).join(" | ");
  }

  function labelTextFor(el) {
    // <label for="id">
    if (el.id) {
      const l = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
      if (l) return text(l);
    }
    // closest label
    const wrap = el.closest("label");
    if (wrap) return text(wrap);
    // greenhouse: label is sibling under .field
    const fld = el.closest(".field, .application-question, .form-field, [role='group']");
    if (fld) {
      const lab = fld.querySelector("label, legend, .label, .question-label");
      if (lab) return text(lab);
    }
    // workday: label may be above in same data-fkit-id grouping
    const wd = el.closest("[data-automation-id]");
    if (wd) {
      const lab = wd.querySelector("label");
      if (lab) return text(lab);
    }
    return "";
  }

  function text(el) {
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function cssEscape(s) {
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
    return String(s).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  function findFillableInputs(root = document) {
    const sel = [
      "input[type=text]",
      "input[type=email]",
      "input[type=tel]",
      "input[type=url]",
      "input[type=number]",
      "input:not([type])",
      "textarea",
      "select",
      "[contenteditable=true]",
    ].join(",");
    return Array.from(root.querySelectorAll(sel)).filter(isVisible);
  }

  function isVisible(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type === "hidden") return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    return true;
  }

  function setFieldValue(el, value) {
    if (value == null) return false;
    value = String(value);

    if (el.tagName === "SELECT") {
      return setSelect(el, value);
    }
    if (el.getAttribute("contenteditable") === "true") {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return true;
    }

    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function setSelect(el, value) {
    const v = value.toLowerCase();
    let match = null;
    for (const opt of el.options) {
      const t = (opt.text || "").toLowerCase();
      const ov = (opt.value || "").toLowerCase();
      if (t === v || ov === v) {
        match = opt;
        break;
      }
    }
    if (!match) {
      for (const opt of el.options) {
        const t = (opt.text || "").toLowerCase();
        if (t.includes(v) || v.includes(t)) {
          match = opt;
          break;
        }
      }
    }
    if (!match) return false;
    el.value = match.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function attachResumeFile(input, resume) {
    try {
      const bin = base64ToUint8(resume.dataBase64);
      const file = new File([bin], resume.name, { type: resume.mime || "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      console.warn("[JobFill] attachResumeFile failed", e);
      return false;
    }
  }

  function base64ToUint8(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function isLongFreeText(el) {
    const isTextarea = el.tagName === "TEXTAREA";
    const isContentEditable = el.getAttribute("contenteditable") === "true";
    const isTextInput =
      el.tagName === "INPUT" && (!el.type || el.type === "text" || el.type === "search");

    if (!isTextarea && !isContentEditable && !isTextInput) return false;

    // Skip text inputs the autofill matcher already owns (firstName, email, linkedin, …).
    if (isTextInput && getFieldKey(el)) return false;

    const ctx = describeField(el);
    const openEnded =
      /why|tell us|describe|cover|motivation|interest|reason|additional|anything|comments|message|explain|elaborate|share|thoughts|how would|what (makes|do|are|is)|provide.*details|in your own words/i;
    if (openEnded.test(ctx)) return true;

    if (isContentEditable) return true;

    if (isTextarea) {
      const rows = parseInt(el.getAttribute("rows") || "0", 10);
      return rows >= 3 || rows === 0;
    }

    // Plain <input type="text"> with no open-ended label and no profile mapping —
    // probably a short generic field, leave it alone.
    return false;
  }

  self.JobFillMatcher = {
    FIELD_PATTERNS,
    getFieldKey,
    describeField,
    findFillableInputs,
    setFieldValue,
    attachResumeFile,
    isLongFreeText,
    isVisible,
  };
})();
