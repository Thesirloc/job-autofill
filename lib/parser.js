/* JobFill — page/job context extraction */
(function () {
  function getJobContext() {
    const title =
      pickText([
        '[data-source="job_title"]',
        ".app-title",
        ".posting-headline h2",
        '[data-automation-id="jobPostingHeader"]',
        "h1",
      ]) || document.title;

    const company =
      pickText([
        ".company-name",
        ".main-header-text a",
        '[data-automation-id="company"]',
      ]) || guessCompanyFromHost();

    const jobLoc = pickText([
      ".location",
      ".posting-categories .location",
      '[data-automation-id="locations"]',
    ]);

    const description = pickText(
      [
        "#content",
        ".job-post",
        ".content",
        ".section-wrapper.page-centered",
        '[data-automation-id="jobPostingDescription"]',
        "article",
      ],
      4000
    );

    return {
      url: window.location.href,
      host: window.location.host,
      title: clean(title),
      company: clean(company),
      jobLocation: clean(jobLoc),
      description: clean(description),
    };
  }

  function guessCompanyFromHost() {
    const h = window.location.hostname;
    // jobs.lever.co/<company>/...
    if (h.endsWith("lever.co")) {
      const parts = window.location.pathname.split("/").filter(Boolean);
      return parts[0] || "";
    }
    // boards.greenhouse.io/<company>/...
    if (h.endsWith("greenhouse.io")) {
      const parts = window.location.pathname.split("/").filter(Boolean);
      return parts[0] || "";
    }
    // <company>.myworkdayjobs.com/...
    const m = h.match(/^([^.]+)\.(?:wd\d+\.)?myworkdayjobs\.com$/i);
    if (m) return m[1];
    return "";
  }

  function pickText(selectors, max = 600) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = (el.innerText || el.textContent || "").trim();
        if (t) return t.slice(0, max);
      }
    }
    return "";
  }

  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  self.JobFillParser = { getJobContext };
})();
