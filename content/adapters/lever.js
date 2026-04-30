/* JobFill — Lever adapter
 * Lever hosts forms at jobs.lever.co/<co>/<job-id>/apply.
 * It's React; field names follow patterns like name, email, phone, urls[LinkedIn], etc.
 * Resume upload is input[name="resume"][type="file"].
 */
(function () {
  function detect() {
    return /lever\.co$/.test(location.hostname) || !!document.querySelector('form[action*="lever"]');
  }

  function findResumeInput() {
    return (
      document.querySelector('input[type="file"][name="resume"]') ||
      document.querySelector('input[type="file"][name*="resume" i]') ||
      document.querySelector('input[type="file"]')
    );
  }

  function findCoverLetterTextarea() {
    return document.querySelector('textarea[name="comments"], textarea[name*="cover" i]');
  }

  function findQuestionBlocks() {
    return Array.from(
      document.querySelectorAll(".application-question, .application-field, li.application-field, .form-field")
    );
  }

  function name() { return "Lever"; }

  self.JobFillAdapters = self.JobFillAdapters || {};
  self.JobFillAdapters.lever = { name, detect, findResumeInput, findCoverLetterTextarea, findQuestionBlocks };
})();
