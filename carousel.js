(() => {
  "use strict";

  const SLIDE_DURATION_MS = 60_000;
  const TRANSITION_LOCK_MS = 900;
  const MESSAGE_TYPE = "unifahe-carousel-next";

  const carousel = document.querySelector(".carousel");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = Array.from(document.querySelectorAll(".dot"));
  const timerProgress = document.getElementById("timerProgress");
  const currentSlideNumber = document.getElementById("currentSlideNumber");
  const carouselUi = document.querySelector(".carousel-ui");

  let currentIndex = 0;
  let slideTimer = null;
  let transitionLocked = false;
  let uiFadeTimer = null;

  function restartProgress() {
    if (!timerProgress) return;

    timerProgress.classList.remove("is-running");
    timerProgress.style.setProperty("--slide-duration", `${SLIDE_DURATION_MS}ms`);
    void timerProgress.offsetWidth;
    timerProgress.classList.add("is-running");
  }

  function scheduleNext() {
    window.clearTimeout(slideTimer);
    slideTimer = window.setTimeout(() => showNext("automatic"), SLIDE_DURATION_MS);
    restartProgress();
  }

  function showUiTemporarily() {
    if (!carouselUi) return;

    carouselUi.classList.remove("is-subtle");
    window.clearTimeout(uiFadeTimer);
    uiFadeTimer = window.setTimeout(() => {
      carouselUi.classList.add("is-subtle");
    }, 5000);
  }

  function renderSlide(nextIndex) {
    slides.forEach((slide, index) => {
      const active = index === nextIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === nextIndex);
    });

    if (currentSlideNumber) {
      currentSlideNumber.textContent = String(nextIndex + 1);
    }
  }

  function showNext(source = "manual") {
    if (slides.length < 2 || transitionLocked || document.hidden) {
      if (!document.hidden) scheduleNext();
      return;
    }

    transitionLocked = true;
    currentIndex = (currentIndex + 1) % slides.length;

    carousel.classList.remove("is-changing");
    void carousel.offsetWidth;
    carousel.classList.add("is-changing");
    renderSlide(currentIndex);
    scheduleNext();

    if (source === "manual") showUiTemporarily();

    window.setTimeout(() => {
      transitionLocked = false;
      carousel.classList.remove("is-changing");
    }, TRANSITION_LOCK_MS);
  }

  function isCarouselMessage(event) {
    return event?.data?.type === MESSAGE_TYPE;
  }

  window.addEventListener("message", event => {
    if (isCarouselMessage(event)) showNext("manual");
  });

  document.addEventListener("click", event => {
    if (event.target.closest("iframe")) return;
    showNext("manual");
  });

  document.addEventListener("keydown", event => {
    if (["ArrowRight", "ArrowLeft", " ", "Enter"].includes(event.key)) {
      event.preventDefault();
      showNext("manual");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(slideTimer);
      timerProgress?.classList.remove("is-running");
      return;
    }

    scheduleNext();
  });

  renderSlide(currentIndex);
  scheduleNext();
  showUiTemporarily();
})();
