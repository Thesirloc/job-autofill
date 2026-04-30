/* JobFill — Greenhouse adapter
 * Greenhouse hosts forms at:
 *   - boards.greenhouse.io/<co>/jobs/<id>
 *   - job-boards.greenhouse.io/<co>/jobs/<id>
 *   - <co>.greenhouse.io
 * The application form is a regular HTML form. Custom questions live under
 * .application-question. Resume upload is a hidden <input type="file">
 * triggered by a styled "Attach" button.
 */
(function () {
  function detect() {
    return /greenhouse\.io$/.test(location.hostname) || !!document.querySelector("#application_form, form#main_fields");
  }

  function findResumeInput() {
    return (
      document.querySelector('input[type="file"][name*="resume" i]') ||
      document.querySelector('input[type="file"][id*="resume" i]') ||
      document.querySelector('input[type="file"]')
    );
  }

  function findCoverLetterTextarea() {
    return document.querySelector('textarea[name*="cover" i], textarea[id*="cover" i]');
  }

  // Find every "question block" so we can inject AI-draft buttons.
  function findQuestionBlocks() {
    return Array.from(
      document.querySelectorAll(".application-question, .field, .form-field")
    );
  }

  function name() { return "Greenhouse"; }

  self.JobFillAdapters = self.JobFillAdapters || {};
  self.JobFillAdapters.greenhouse = { name, detect, findResumeInput, findCoverLetterTextarea, findQuestionBlocks };
})();
