(() => {
  "use strict";

  if (window.parent === window) return;

  let lastSentAt = 0;

  document.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastSentAt < 950) return;
    lastSentAt = now;

    window.parent.postMessage({ type: "unifahe-carousel-next" }, "*");
  }, true);
})();
