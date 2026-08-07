const CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzXCgSQ7yrj3evtyX6U9D7B5uBVlmtBWC5vayHc3yA24MujmrSQtEgERn9oFORDzmYv/exec",
  refreshIntervalMs: 60_000,
  previewDurationMs: 8500
};

const dashboardElement = document.querySelector(".dashboard");
const GOAL = Number(dashboardElement?.dataset.goal) || 1_200_000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const animationFrames = new WeakMap();
let liveRevenueValue = 0;
let displayedRevenueValue = 0;
let displayedRemainingValue = GOAL;
let displayedPercentValue = 0;
let displayedRemainingPercentValue = 100;
let hasRenderedRevenue = false;
let hasCelebratedMillion = false;
let previewActive = false;
let previewTimer = null;
let celebrationAnimationFrame = null;
let goalCountdownRunning = false;
let goalCountdownSequence = 0;

function formatPercent(value, digits = 0) {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

function animateValue({
  key,
  from,
  to,
  duration = 1000,
  onUpdate,
  onComplete
}) {
  const previousFrame = animationFrames.get(key);
  if (previousFrame) cancelAnimationFrame(previousFrame);

  const startTime = performance.now();
  const difference = to - from;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = from + difference * eased;
    onUpdate?.(value);

    if (progress < 1) {
      const frame = requestAnimationFrame(update);
      animationFrames.set(key, frame);
    } else {
      onUpdate?.(to);
      animationFrames.delete(key);
      onComplete?.(to);
    }
  }

  const frame = requestAnimationFrame(update);
  animationFrames.set(key, frame);
}

function setProgressVisual(percentage) {
  const normalized = Math.min(Math.max(percentage, 0), 100);
  const fill = document.getElementById("progressFill");
  const badge = document.getElementById("progressBadge");

  if (fill) {
    fill.style.width = normalized <= 0 ? "0" : `calc(${normalized}% - 4px)`;
  }

  if (badge) {
    badge.style.left = `${Math.min(Math.max(normalized, 5), 95)}%`;
  }
}

function setGoalVisualState(active, { preview = false, entering = false } = {}) {
  document.body.classList.toggle("goal-achieved", active);
  document.body.classList.toggle("goal-preview", active && preview);

  if (entering) {
    document.body.classList.add("goal-animating");
    window.setTimeout(() => {
      document.body.classList.remove("goal-animating");
    }, 1800);
  } else if (!active) {
    document.body.classList.remove("goal-animating");
  }
}

function createCelebrationParticles(canvas, duration = 7000) {
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  if (celebrationAnimationFrame) {
    cancelAnimationFrame(celebrationAnimationFrame);
    celebrationAnimationFrame = null;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const host = canvas.parentElement;
  let width = 0;
  let height = 0;
  let startTime = performance.now();
  let lastBurst = -800;
  const sparkles = [];
  const bursts = [];
  const flares = [];
  const colors = ["#ffd76b", "#ffbe38", "#fff1b4", "#ff9f1a", "#ffeaa0"];

  function resizeCanvas() {
    const rect = (host || canvas).getBoundingClientRect();
    width = Math.max(Math.round(rect.width), 1);
    height = Math.max(Math.round(rect.height), 1);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function addSparkles(amount = 28) {
    for (let index = 0; index < amount; index += 1) {
      sparkles.push({
        x: width * (.05 + Math.random() * .86),
        y: height * (.04 + Math.random() * .66),
        radius: .8 + Math.random() * 2.8,
        alpha: .18 + Math.random() * .55,
        twinkle: Math.random() * Math.PI * 2,
        life: 1,
        driftX: (-.2 + Math.random() * .4),
        driftY: -.04 - Math.random() * .12,
        decay: .002 + Math.random() * .004,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function addFlare(x, y) {
    flares.push({
      x,
      y,
      radius: 8,
      life: 1,
      decay: .028 + Math.random() * .012,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function addBurst(x, y, amount = reducedMotion ? 22 : 42) {
    addFlare(x, y);
    for (let index = 0; index < amount; index += 1) {
      const angle = (Math.PI * 2 * index) / amount + Math.random() * .1;
      const speed = 1.5 + Math.random() * 3.8;
      bursts.push({
        x,
        y,
        previousX: x,
        previousY: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: 1,
        decay: .015 + Math.random() * .018,
        width: 1.1 + Math.random() * 1.9,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function drawFlares() {
    for (let index = flares.length - 1; index >= 0; index -= 1) {
      const flare = flares[index];
      flare.radius += 4.2;
      flare.life -= flare.decay;

      const gradient = context.createRadialGradient(flare.x, flare.y, 0, flare.x, flare.y, flare.radius * 1.8);
      gradient.addColorStop(0, 'rgba(255,245,190,' + Math.max(flare.life * .45, 0) + ')');
      gradient.addColorStop(.35, 'rgba(255,205,90,' + Math.max(flare.life * .2, 0) + ')');
      gradient.addColorStop(1, 'rgba(255,180,40,0)');
      context.fillStyle = gradient;
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(flare.x, flare.y, flare.radius * 1.8, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = flare.color;
      context.globalAlpha = Math.max(flare.life * .45, 0);
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
      context.stroke();

      if (flare.life <= 0) flares.splice(index, 1);
    }

    context.globalAlpha = 1;
  }

  function drawSparkles() {
    for (let index = sparkles.length - 1; index >= 0; index -= 1) {
      const particle = sparkles[index];
      particle.twinkle += .09;
      particle.x += particle.driftX;
      particle.y += particle.driftY;
      particle.life -= particle.decay;

      const glow = Math.max(particle.alpha * (0.55 + Math.sin(particle.twinkle) * .45), 0);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.globalAlpha = Math.max(glow * particle.life, 0);
      context.shadowBlur = 16;
      context.shadowColor = particle.color;
      context.fill();

      if (particle.life <= 0) sparkles.splice(index, 1);
    }

    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  function drawBursts() {
    context.lineCap = "round";
    for (let index = bursts.length - 1; index >= 0; index -= 1) {
      const particle = bursts[index];
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.velocityX *= .986;
      particle.velocityY = particle.velocityY * .988 + .022;
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.life -= particle.decay;

      context.beginPath();
      context.moveTo(particle.previousX, particle.previousY);
      context.lineTo(particle.x, particle.y);
      context.strokeStyle = particle.color;
      context.globalAlpha = Math.max(particle.life, 0);
      context.lineWidth = particle.width;
      context.shadowBlur = 20;
      context.shadowColor = particle.color;
      context.stroke();

      if (particle.life <= 0) bursts.splice(index, 1);
    }

    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  function animate(now) {
    const elapsed = now - startTime;
    context.clearRect(0, 0, width, height);

    if (elapsed - lastBurst > 760 && elapsed < duration * .88) {
      lastBurst = elapsed;
      const positions = [
        { x: width * .08, y: height * .16 },
        { x: width * .18, y: height * .28 },
        { x: width * .49, y: height * .18 },
        { x: width * .66, y: height * .24 },
        { x: width * .79, y: height * .14 }
      ];
      const origin = positions[Math.floor((elapsed / 760) % positions.length)];
      addBurst(origin.x, origin.y);
      addSparkles(reducedMotion ? 10 : 22);
    }

    if (Math.random() > .68) addSparkles(2);

    drawFlares();
    drawSparkles();
    drawBursts();

    if (elapsed < duration || sparkles.length || bursts.length || flares.length) {
      celebrationAnimationFrame = requestAnimationFrame(animate);
    } else {
      context.clearRect(0, 0, width, height);
      celebrationAnimationFrame = null;
    }
  }

  resizeCanvas();
  addSparkles(reducedMotion ? 22 : 54);
  addBurst(width * .08, height * .16, reducedMotion ? 16 : 24);
  addBurst(width * .18, height * .28, reducedMotion ? 14 : 22);
  addBurst(width * .49, height * .18, reducedMotion ? 16 : 24);
  addBurst(width * .66, height * .24, reducedMotion ? 14 : 22);
  addBurst(width * .79, height * .14, reducedMotion ? 16 : 24);
  window.addEventListener("resize", resizeCanvas, { once: true });
  celebrationAnimationFrame = requestAnimationFrame(animate);
}

function stopCelebrationParticles() {
  const canvas = document.getElementById("performanceCelebrationLayer");
  if (celebrationAnimationFrame) {
    cancelAnimationFrame(celebrationAnimationFrame);
    celebrationAnimationFrame = null;
  }
  if (canvas) {
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function renderDashboard(faturado, { animate = true, honorPreview = false } = {}) {
  const safeRevenue = Math.max(Number(faturado) || 0, 0);
  const remaining = Math.max(GOAL - safeRevenue, 0);
  const percentage = GOAL > 0 ? Math.min((safeRevenue / GOAL) * 100, 100) : 0;
  const remainingPercentage = Math.max(100 - percentage, 0);

  const currentElement = document.getElementById("currentRevenue");
  const remainingElement = document.getElementById("remainingRevenue");
  const progressPercentElement = document.getElementById("progressPercent");
  const progressCaptionElement = document.getElementById("progressCaption");
  const remainingPercentElement = document.getElementById("remainingPercent");

  if (animate) {
    animateValue({
      key: currentElement,
      from: hasRenderedRevenue ? displayedRevenueValue : 0,
      to: safeRevenue,
      duration: 1450,
      onUpdate: value => {
        currentElement.textContent = currencyFormatter.format(value);
      }
    });

    animateValue({
      key: remainingElement,
      from: hasRenderedRevenue ? displayedRemainingValue : GOAL,
      to: remaining,
      duration: 1450,
      onUpdate: value => {
        remainingElement.textContent = currencyFormatter.format(Math.max(value, 0));
      }
    });

    animateValue({
      key: progressPercentElement,
      from: hasRenderedRevenue ? displayedPercentValue : 0,
      to: percentage,
      duration: 1400,
      onUpdate: value => {
        const rounded = Math.round(value);
        progressPercentElement.textContent = `${rounded}%`;
        progressCaptionElement.textContent = `${rounded}%`;
        setProgressVisual(value);
      }
    });

    animateValue({
      key: remainingPercentElement,
      from: hasRenderedRevenue ? displayedRemainingPercentValue : 100,
      to: remainingPercentage,
      duration: 1400,
      onUpdate: value => {
        remainingPercentElement.textContent = formatPercent(Math.max(value, 0), 1);
      }
    });
  } else {
    currentElement.textContent = currencyFormatter.format(safeRevenue);
    remainingElement.textContent = currencyFormatter.format(remaining);
    progressPercentElement.textContent = `${Math.round(percentage)}%`;
    progressCaptionElement.textContent = `${Math.round(percentage)}%`;
    remainingPercentElement.textContent = formatPercent(remainingPercentage, 1);
    setProgressVisual(percentage);
  }

  displayedRevenueValue = safeRevenue;
  displayedRemainingValue = remaining;
  displayedPercentValue = percentage;
  displayedRemainingPercentValue = remainingPercentage;
  hasRenderedRevenue = true;

  if (!honorPreview) {
    const reachedGoal = safeRevenue >= GOAL;
    const entering = reachedGoal && !document.body.classList.contains("goal-achieved");
    setGoalVisualState(reachedGoal, { preview: false, entering });
  }
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function restartTickAnimation(element) {
  if (!element) return;
  element.classList.remove("is-ticking");
  void element.offsetWidth;
  element.classList.add("is-ticking");
}

async function runGoalCountdown({ preview = false, preserve = false } = {}) {
  if (goalCountdownRunning) return;

  goalCountdownRunning = true;
  const sequence = ++goalCountdownSequence;
  window.clearTimeout(previewTimer);
  stopCelebrationParticles();

  const overlay = document.getElementById("goalCountdownOverlay");
  const numberElement = document.getElementById("goalCountdownNumber");
  const trigger = document.getElementById("celebrationTrigger");

  if (!overlay || !numberElement) {
    goalCountdownRunning = false;
    activateGoalExperience({ preview, preserve });
    return;
  }

  if (!preview) {
    hasCelebratedMillion = true;
  }

  previewActive = preview;
  trigger?.setAttribute("disabled", "");
  setConnectionStatus(
    preview ? "is-demo" : "is-loading",
    preview ? "Preparando a prévia de 1,2 milhão..." : "Meta alcançada! Preparando comemoração..."
  );

  overlay.hidden = false;
  overlay.classList.remove("is-launching");
  overlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => overlay.classList.add("is-active"));

  for (const number of [3, 2, 1]) {
    if (sequence !== goalCountdownSequence) return;
    numberElement.textContent = String(number);
    restartTickAnimation(numberElement);
    await wait(900);
  }

  if (sequence !== goalCountdownSequence) return;
  overlay.classList.add("is-launching");
  await wait(460);

  overlay.classList.remove("is-active", "is-launching");
  overlay.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  numberElement.classList.remove("is-ticking");
  trigger?.removeAttribute("disabled");
  goalCountdownRunning = false;

  activateGoalExperience({ preview, preserve });
}

function restoreRealDashboard() {
  previewActive = false;
  window.clearTimeout(previewTimer);

  if (liveRevenueValue >= GOAL) {
    hasCelebratedMillion = true;
    renderDashboard(liveRevenueValue, { animate: true, honorPreview: true });
    setGoalVisualState(true, { preview: false, entering: false });
    createCelebrationParticles(document.getElementById("performanceCelebrationLayer"), 5200);
    setConnectionStatus("is-connected", "Meta de R$ 1,2 milhão atingida!");
    return;
  }

  stopCelebrationParticles();
  setGoalVisualState(false);
  renderDashboard(liveRevenueValue, { animate: true, honorPreview: true });

  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  setConnectionStatus("is-connected", `Planilha atualizada às ${time}`);
}

function activateGoalExperience({ preview = false, preserve = false } = {}) {
  window.clearTimeout(previewTimer);
  previewActive = preview;

  const entering = !document.body.classList.contains("goal-achieved");
  setGoalVisualState(true, { preview, entering });
  createCelebrationParticles(document.getElementById("performanceCelebrationLayer"));
  renderDashboard(GOAL, { animate: true, honorPreview: true });

  if (preview) {
    setConnectionStatus("is-demo", "Prévia da animação de 1,2 milhão");
    previewTimer = window.setTimeout(restoreRealDashboard, CONFIG.previewDurationMs);
  } else {
    hasCelebratedMillion = true;
    if (!preserve) {
      setConnectionStatus("is-connected", "Meta de R$ 1,2 milhão atingida!");
    }
  }
}

function maybeCelebrateGoal(revenue) {
  if (previewActive || goalCountdownRunning) return;

  if (revenue >= GOAL) {
    if (!hasCelebratedMillion) {
      runGoalCountdown({ preview: false, preserve: false });
    } else {
      setGoalVisualState(true, { preview: false, entering: false });
    }
  } else {
    hasCelebratedMillion = false;
    stopCelebrationParticles();
    setGoalVisualState(false);
  }
}

function hasConfiguredAppsScriptUrl() {
  const url = CONFIG.appsScriptUrl.trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(url);
}

function setConnectionStatus(type, text) {
  const status = document.getElementById("connectionStatus");
  const statusText = document.getElementById("connectionStatusText");
  if (!status || !statusText) return;

  status.classList.remove("is-loading", "is-connected", "is-error", "is-demo");
  status.classList.add(type);
  statusText.textContent = text;
}

function parseRevenueFromResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida do Apps Script.");
  }

  if (data.success === false || data.sucesso === false) {
    throw new Error(data.error || data.erro || data.mensagem || "O Apps Script retornou um erro.");
  }

  const rawValue = data.faturado ?? data.currentRevenue ?? data.valor;
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw new Error("O valor de Agosto!AK35 não é numérico.");
  }

  if (data.origem && data.origem !== "Agosto!AK35") {
    throw new Error(`O Apps Script respondeu uma origem inesperada: ${data.origem}.`);
  }

  console.info("[Meta milhão] Fonte confirmada:", {
    origem: data.origem || "Agosto!AK35",
    planilhaNome: data.planilhaNome || "não informado",
    planilhaId: data.planilhaId || "não informado",
    valorBruto: data.valorBruto,
    valorExibido: data.valorExibido,
    formula: data.formula || ""
  });

  return numericValue;
}

async function fetchRevenueFromSheet() {
  const separator = CONFIG.appsScriptUrl.includes("?") ? "&" : "?";
  const url = `${CONFIG.appsScriptUrl}${separator}rota=metaMilhao&nocache=1&t=${Date.now()}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status}.`);
  }

  return parseRevenueFromResponse(await response.json());
}

function clearDynamicValues() {
  const ids = [
    "currentRevenue",
    "remainingRevenue",
    "progressPercent",
    "progressCaption",
    "remainingPercent"
  ];

  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = "";
  });

  setProgressVisual(0);
}

async function updateRevenue({ initial = false } = {}) {
  if (!hasConfiguredAppsScriptUrl()) {
    clearDynamicValues();
    setConnectionStatus("is-demo", "Aguardando URL da planilha");
    return;
  }

  if (!previewActive) {
    setConnectionStatus("is-loading", initial ? "Conectando à planilha..." : "Atualizando dados...");
  }

  try {
    const faturado = await fetchRevenueFromSheet();
    liveRevenueValue = Math.max(Number(faturado) || 0, 0);

    if (!previewActive && !goalCountdownRunning) {
      const firstGoalReach = liveRevenueValue >= GOAL && !hasCelebratedMillion;
      renderDashboard(liveRevenueValue, {
        animate: true,
        honorPreview: firstGoalReach
      });
      maybeCelebrateGoal(liveRevenueValue);

      const time = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date());

      if (!goalCountdownRunning) {
        setConnectionStatus(
          "is-connected",
          liveRevenueValue >= GOAL ? "Meta de R$ 1,2 milhão atingida!" : `Planilha atualizada às ${time}`
        );
      }
    }
  } catch (error) {
    console.error("Não foi possível atualizar o faturamento:", error);

    if (!hasRenderedRevenue) {
      clearDynamicValues();
    }

    setConnectionStatus("is-error", "Erro ao atualizar a planilha");
  }
}

function getMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

function updateCountdown() {
  const now = new Date();
  const monthEnd = getMonthEnd();
  const difference = Math.max(monthEnd.getTime() - now.getTime(), 0);

  const days = Math.floor(difference / 86_400_000);
  const hours = Math.floor((difference % 86_400_000) / 3_600_000);
  const minutes = Math.floor((difference % 3_600_000) / 60_000);
  const seconds = Math.floor((difference % 60_000) / 1_000);

  document.getElementById("days").textContent = String(days).padStart(2, "0");
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  document.getElementById("monthEndText").textContent =
    `Até 23h59 do dia ${lastDay.getDate()} de ${monthName}`;
}

function replayMillionCelebration() {
  runGoalCountdown({ preview: true });
}

window.triggerMillionCelebration = replayMillionCelebration;

window.addEventListener("DOMContentLoaded", async () => {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  document.getElementById("celebrationTrigger")?.addEventListener("click", replayMillionCelebration);

  await updateRevenue({ initial: true });
  setInterval(() => updateRevenue(), CONFIG.refreshIntervalMs);

  document.getElementById("pageLoader")?.classList.add("hidden");
});
