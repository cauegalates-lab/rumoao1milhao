const CONFIG = {
  // Depois de publicar o arquivo Code.gs como aplicativo da web,
  // cole aqui a URL terminada em /exec.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzi-jbRSsxs-zLwMZ8ujKbNboKoQiyXYR0wdhLCOGwylcEajAaO7RR8mWadUDKM5tQ7/exec",

  // Atualiza o faturamento automaticamente a cada 60 segundos.
  refreshIntervalMs: 60_000,

  // Evita que uma falha de rede deixe o painel preso no carregamento.
  requestTimeoutMs: 12_000
};

const dashboardElement = document.querySelector(".dashboard");
const FINAL_GOAL = Math.max(Number(dashboardElement?.dataset.goal) || 1_200_000, 1);
const MILESTONE_GOAL = Math.min(
  Math.max(Number(dashboardElement?.dataset.milestoneGoal) || 1_000_000, 0),
  FINAL_GOAL
);
const EXTRA_DAYS = Math.max(Number(dashboardElement?.dataset.extraDays) || 2, 0);
const MILESTONE_POSITION = (MILESTONE_GOAL / FINAL_GOAL) * 100;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const animationFrames = new WeakMap();
let currentRevenueValue = 0;
let hasRenderedRevenue = false;

function parseMoneyValue(rawValue) {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue !== "string") return Number(rawValue);

  let normalized = rawValue
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");

  const hasComma = normalized.includes(",");
  const dotCount = (normalized.match(/\./g) || []).length;

  if (hasComma) {
    // Formato brasileiro: 903.686,33 ou 903686,33.
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (dotCount > 1) {
    // Separadores de milhar sem casas decimais: 1.200.000.
    normalized = normalized.replace(/\./g, "");
  } else if (dotCount === 1) {
    const decimalPart = normalized.split(".")[1] || "";

    // Um único ponto com três dígitos finais normalmente é milhar: 1.200.
    // Com uma ou duas casas, preserva o decimal do JSON: 903686.33.
    if (decimalPart.length === 3) {
      normalized = normalized.replace(".", "");
    }
  }

  return Number(normalized);
}

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

function configureGoals() {
  const track = document.getElementById("progressTrack");
  const marker = document.getElementById("millionGoalMarker");
  const goalRevenue = document.getElementById("goalRevenue");
  const milestoneGoalRevenue = document.getElementById("milestoneGoalRevenue");
  const finalGoalRevenue = document.getElementById("finalGoalRevenue");

  track?.style.setProperty("--milestone-position", `${MILESTONE_POSITION}%`);

  if (marker) {
    marker.style.left = `${MILESTONE_POSITION}%`;
    marker.setAttribute(
      "aria-label",
      `Marco da primeira meta: ${currencyFormatter.format(MILESTONE_GOAL)}, localizado em ${MILESTONE_POSITION.toFixed(2).replace(".", ",")}% da barra`
    );
  }

  if (goalRevenue) goalRevenue.textContent = currencyFormatter.format(FINAL_GOAL);
  if (milestoneGoalRevenue) milestoneGoalRevenue.textContent = currencyFormatter.format(MILESTONE_GOAL);
  if (finalGoalRevenue) finalGoalRevenue.textContent = currencyFormatter.format(FINAL_GOAL);
}

function renderDashboard(faturado, { animate = true } = {}) {
  const safeRevenue = Math.max(parseMoneyValue(faturado) || 0, 0);
  const remaining = Math.max(FINAL_GOAL - safeRevenue, 0);
  const percentage = Math.min((safeRevenue / FINAL_GOAL) * 100, 100);
  const remainingPercentage = Math.max(100 - percentage, 0);
  const percentageText = `${Math.round(percentage)}%`;

  const currentElement = document.getElementById("currentRevenue");
  const remainingElement = document.getElementById("remainingRevenue");
  const previousRevenue = hasRenderedRevenue ? currentRevenueValue : 0;
  const previousRemaining = Math.max(FINAL_GOAL - previousRevenue, 0);

  if (animate) {
    animateNumber(currentElement, previousRevenue, safeRevenue, value => currencyFormatter.format(value));
    animateNumber(remainingElement, previousRemaining, remaining, value => currencyFormatter.format(value));
  } else {
    if (currentElement) currentElement.textContent = currencyFormatter.format(safeRevenue);
    if (remainingElement) remainingElement.textContent = currencyFormatter.format(remaining);
  }

  document.getElementById("progressPercent").textContent = percentageText;
  document.getElementById("progressCaption").textContent = percentageText;
  document.getElementById("remainingPercent").textContent =
    `${remainingPercentage.toFixed(1).replace(".", ",")}%`;

  const marker = document.getElementById("millionGoalMarker");
  marker?.classList.toggle("is-reached", safeRevenue >= MILESTONE_GOAL);

  const track = document.getElementById("progressTrack");
  track?.setAttribute(
    "aria-label",
    `${currencyFormatter.format(safeRevenue)} de ${currencyFormatter.format(FINAL_GOAL)}. ` +
    `Primeira meta em ${currencyFormatter.format(MILESTONE_GOAL)}.`
  );

  requestAnimationFrame(() => {
    const fill = document.getElementById("progressFill");
    const badge = document.getElementById("progressBadge");

    if (fill) {
      fill.style.width = percentage > 0 ? `calc(${percentage}% - 8px)` : "0";
    }

    if (badge) {
      badge.style.left = `${Math.min(Math.max(percentage, 5), 95)}%`;
    }
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
  const numericValue = parseMoneyValue(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw new Error("O valor de faturamento retornado pela planilha não é numérico.");
  }

  return numericValue;
}

async function fetchRevenueFromSheet() {
  const separator = CONFIG.appsScriptUrl.includes("?") ? "&" : "?";
  const url = `${CONFIG.appsScriptUrl}${separator}rota=metaMilhao&t=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status}.`);
    }

    return parseRevenueFromResponse(await response.json());
  } finally {
    clearTimeout(timeoutId);
  }
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

function getPreviewRevenue() {
  const rawValue = new URLSearchParams(window.location.search).get("previewRevenue");
  if (!rawValue) return null;

  const numericValue = parseMoneyValue(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

async function updateRevenue({ initial = false } = {}) {
  const previewRevenue = getPreviewRevenue();

  if (previewRevenue !== null) {
    renderDashboard(previewRevenue, { animate: !initial });
    setConnectionStatus("is-demo", "Pré-visualização dos cálculos");
    return;
  }

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

    const message = error?.name === "AbortError"
      ? "Tempo limite ao atualizar"
      : "Erro ao atualizar a planilha";

    setConnectionStatus("is-error", message);
  }
}

function getExtendedDeadline(now = new Date()) {
  let campaignYear = now.getFullYear();
  let campaignMonth = now.getMonth();

  // Durante os dias extras do começo do mês seguinte, mantém a campanha
  // vinculada ao mês anterior em vez de iniciar uma nova contagem.
  if (EXTRA_DAYS > 0 && now.getDate() <= EXTRA_DAYS) {
    const previousMonth = new Date(campaignYear, campaignMonth, 0);
    campaignYear = previousMonth.getFullYear();
    campaignMonth = previousMonth.getMonth();
  }

  // Ex.: julho + 2 dias extras termina em 03/08 às 00h,
  // ou seja, inclui integralmente os dias 01 e 02 de agosto.
  return new Date(campaignYear, campaignMonth + 1, EXTRA_DAYS + 1, 0, 0, 0, 0);
}

function updateCountdown() {
  const now = new Date();
  const deadline = getExtendedDeadline(now);
  const difference = Math.max(deadline.getTime() - now.getTime(), 0);

  const days = Math.floor(difference / 86_400_000);
  const hours = Math.floor((difference % 86_400_000) / 3_600_000);
  const minutes = Math.floor((difference % 3_600_000) / 60_000);
  const seconds = Math.floor((difference % 60_000) / 1_000);

  document.getElementById("days").textContent = String(days).padStart(2, "0");
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");

  const finalIncludedMoment = new Date(deadline.getTime() - 1);
  const day = String(finalIncludedMoment.getDate()).padStart(2, "0");
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(finalIncludedMoment);
  document.getElementById("monthEndText").textContent =
    `Até 23h59 do dia ${day} de ${monthName} — prazo estendido`;
}

window.addEventListener("DOMContentLoaded", async () => {
  configureGoals();
  updateCountdown();
  setInterval(updateCountdown, 1000);

  try {
    await updateRevenue({ initial: true });
  } finally {
    document.getElementById("pageLoader")?.classList.add("hidden");
  }

  setInterval(() => updateRevenue(), CONFIG.refreshIntervalMs);
});
