/* JobFill — Workday adapter
 * Workday SPAs use data-automation-id heavily; multi-step apply flow.
 * We focus on the visible step and rely on the generic matcher to fill text inputs.
 * Resume upload is rendered via a styled button + hidden <input type="file">; we look for
 * inputs inside [data-automation-id*="file-upload"].
 */
(function () {
  function detect() {
    return /myworkdayjobs\.com$/.test(location.hostname) || /\.workday\.com$/.test(location.hostname);
  }

  function findResumeInput() {
    return (
      document.querySelector('[data-automation-id*="file-upload"] input[type="file"]') ||
      document.querySelector('input[type="file"][data-automation-id*="resume" i]') ||
      document.querySelector('input[type="file"]')
    );
  }

  function findCoverLetterTextarea() {
    return document.querySelector('textarea[data-automation-id*="cover" i]');
  }

  function findQuestionBlocks() {
    return Array.from(
      document.querySelectorAll('[data-automation-id], div[role="group"]')
    );
  }

  function name() { return "Workday"; }

  self.JobFillAdapters = self.JobFillAdapters || {};
  self.JobFillAdapters.workday = { name, detect, findResumeInput, findCoverLetterTextarea, findQuestionBlocks };
})();
