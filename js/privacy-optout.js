(() => {
  "use strict";
  const checkbox = document.getElementById("analytics-opt-out");
  const status = document.getElementById("analytics-opt-out-status");
  if (!checkbox || !status) return;
  const key = "novelhub:analytics-opt-out:v1";

  // Disabled in HTML until the script confirms it can read and save the
  // browser-local preference. The reader also fails closed when inaccessible.
  let current;
  try {
    current = localStorage.getItem(key) === "1";
    checkbox.checked = current;
    checkbox.disabled = false;
  } catch (_) {
    checkbox.checked = true;
    status.textContent = "Your browser blocks local preferences; anonymous counting is disabled when storage cannot be read.";
    return;
  }

  const render = () => {
    status.textContent = current
      ? "Anonymous visit counting is off in this browser."
      : "Anonymous visit counting is on in this browser.";
  };
  render();

  checkbox.addEventListener("change", () => {
    try {
      if (checkbox.checked) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
      if ((localStorage.getItem(key) === "1") !== checkbox.checked)
        throw new Error("Setting could not be saved");
      current = checkbox.checked;
      render();
    } catch (_) {
      checkbox.checked = current;
      status.textContent = "The preference could not be saved. Browser storage may be blocked. No visit count is sent if the setting cannot be read.";
    }
  });
})();
