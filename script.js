const CONFIG = {
  // Depois de publicar o arquivo Code.gs como aplicativo da web,
  // cole aqui a URL terminada em /exec.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzi-jbRSsxs-zLwMZ8ujKbNboKoQiyXYR0wdhLCOGwylcEajAaO7RR8mWadUDKM5tQ7/exec",

  // Atualiza o faturamento automaticamente a cada 60 segundos.
  refreshIntervalMs: 60_000
};

const dashboardElement = document.querySelector(".dashboard");
const GOAL = Number(dashboardElement?.dataset.goal) || 1_000_000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const animationFrames = new WeakMap();
let currentRevenueValue = 0;
let hasRenderedRevenue = false;

function animateNumber(element, startValue, finalValue, formatter, duration = 1000) {
  if (!element) return;

  const previousFrame = animationFrames.get(element);
  if (previousFrame) cancelAnimationFrame(previousFrame);

  const startTime = performance.now();
  const difference = finalValue - startValue;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(startValue + difference * eased);

    if (progress < 1) {
      const frame = requestAnimationFrame(update);
      animationFrames.set(element, frame);
    } else {
      element.textContent = formatter(finalValue);
      animationFrames.delete(element);
    }
  }

  const frame = requestAnimationFrame(update);
  animationFrames.set(element, frame);
}

function renderDashboard(faturado, { animate = true } = {}) {
  const safeRevenue = Math.max(Number(faturado) || 0, 0);
  const remaining = Math.max(GOAL - safeRevenue, 0);
  const percentage = GOAL > 0 ? Math.min((safeRevenue / GOAL) * 100, 100) : 0;
  const remainingPercentage = Math.max(100 - percentage, 0);
  const percentageText = `${Math.round(percentage)}%`;

  const currentElement = document.getElementById("currentRevenue");
  const remainingElement = document.getElementById("remainingRevenue");
  const previousRevenue = hasRenderedRevenue ? currentRevenueValue : 0;
  const previousRemaining = Math.max(GOAL - previousRevenue, 0);

  if (animate) {
    animateNumber(currentElement, previousRevenue, safeRevenue, value => currencyFormatter.format(value));
    animateNumber(remainingElement, previousRemaining, remaining, value => currencyFormatter.format(value));
  } else {
    currentElement.textContent = currencyFormatter.format(safeRevenue);
    remainingElement.textContent = currencyFormatter.format(remaining);
  }

  document.getElementById("progressPercent").textContent = percentageText;
  document.getElementById("progressCaption").textContent = percentageText;
  document.getElementById("remainingPercent").textContent =
    `${remainingPercentage.toFixed(1).replace(".", ",")}%`;

  requestAnimationFrame(() => {
    const fill = document.getElementById("progressFill");
    const badge = document.getElementById("progressBadge");
    fill.style.width = `calc(${percentage}% - 4px)`;
    badge.style.left = `${Math.min(Math.max(percentage, 5), 95)}%`;
    requestDashboardFit();
  });

  currentRevenueValue = safeRevenue;
  hasRenderedRevenue = true;
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
    throw new Error("O valor de Julho!AK35 não é numérico.");
  }

  return numericValue;
}

async function fetchRevenueFromSheet() {
  const separator = CONFIG.appsScriptUrl.includes("?") ? "&" : "?";
  const url = `${CONFIG.appsScriptUrl}${separator}rota=metaMilhao&t=${Date.now()}`;
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

  const fill = document.getElementById("progressFill");
  const badge = document.getElementById("progressBadge");
  if (fill) fill.style.width = "0";
  if (badge) badge.style.left = "5%";
}

async function updateRevenue({ initial = false } = {}) {
  if (!hasConfiguredAppsScriptUrl()) {
    clearDynamicValues();
    setConnectionStatus("is-demo", "Aguardando URL da planilha");
    return;
  }

  setConnectionStatus("is-loading", initial ? "Conectando à planilha..." : "Atualizando dados...");

  try {
    const faturado = await fetchRevenueFromSheet();
    renderDashboard(faturado, { animate: true });

    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    setConnectionStatus("is-connected", `Planilha atualizada às ${time}`);
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

/**
 * Ajusta o painel inteiro proporcionalmente para caber na tela.
 * Assim o layout permanece igual em TV, notebook, tablet ou celular
 * e nenhuma barra de rolagem é criada.
 */
function fitDashboardToViewport() {
  const dashboard = document.querySelector(".dashboard");
  if (!dashboard) return;

  dashboard.style.setProperty("--dashboard-scale", "1");

  const safeMargin = Math.max(8, Math.min(window.innerWidth, window.innerHeight) * 0.012);
  const availableWidth = Math.max(window.innerWidth - safeMargin * 2, 1);
  const availableHeight = Math.max(window.innerHeight - safeMargin * 2, 1);
  const naturalWidth = dashboard.offsetWidth;
  const naturalHeight = dashboard.offsetHeight;

  const scale = Math.min(
    availableWidth / naturalWidth,
    availableHeight / naturalHeight,
    1
  );

  dashboard.style.setProperty("--dashboard-scale", scale.toFixed(5));
}

let resizeFrame;
function requestDashboardFit() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(fitDashboardToViewport);
}

window.addEventListener("DOMContentLoaded", async () => {
  updateCountdown();
  setInterval(updateCountdown, 1000);

  await updateRevenue({ initial: true });
  setInterval(() => updateRevenue(), CONFIG.refreshIntervalMs);

  requestDashboardFit();
  setTimeout(requestDashboardFit, 80);
  setTimeout(requestDashboardFit, 750);

  document.getElementById("pageLoader").classList.add("hidden");
});

window.addEventListener("load", requestDashboardFit);
window.addEventListener("resize", requestDashboardFit, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(requestDashboardFit, 120));

if ("ResizeObserver" in window) {
  const dashboardObserver = new ResizeObserver(requestDashboardFit);
  window.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.querySelector(".dashboard");
    if (dashboard) dashboardObserver.observe(dashboard);
  });
}
