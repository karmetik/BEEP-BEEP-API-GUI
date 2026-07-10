const DEFAULT_GOOGLE_CLIENT_ID =
  "141226689118-74mdkq0n9e93qda25kp7numpqeuua6q2.apps.googleusercontent.com";

const state = {
  config: {
    apiBaseUrl: "https://beepbeep-api-4goflu766a-uc.a.run.app",
    apiPrefix: "/v1",
    googleClientId: DEFAULT_GOOGLE_CLIENT_ID,
    cloudRunMode: "public",
    platformToken: "",
    appToken: "",
  },
  googleIdToken: "",
  pois: [],
};

let initializedGoogleClientId = "";

const els = {
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  apiPrefix: document.getElementById("apiPrefix"),
  googleClientId: document.getElementById("googleClientId"),
  cloudRunMode: document.getElementById("cloudRunMode"),
  platformTokenWrap: document.getElementById("platformTokenWrap"),
  platformToken: document.getElementById("platformToken"),
  appToken: document.getElementById("appToken"),
  googleIdToken: document.getElementById("googleIdToken"),
  googleButtonWrap: document.getElementById("googleButtonWrap"),
  saveConfigBtn: document.getElementById("saveConfigBtn"),
  initGoogleBtn: document.getElementById("initGoogleBtn"),
  exchangeBtn: document.getElementById("exchangeBtn"),
  poiForm: document.getElementById("poiForm"),
  clearPoiBtn: document.getElementById("clearPoiBtn"),
  listPoisBtn: document.getElementById("listPoisBtn"),
  searchPoisBtn: document.getElementById("searchPoisBtn"),
  categoryFilter: document.getElementById("categoryFilter"),
  searchQuery: document.getElementById("searchQuery"),
  poiTableBody: document.getElementById("poiTableBody"),
  testMethod: document.getElementById("testMethod"),
  testPath: document.getElementById("testPath"),
  testBody: document.getElementById("testBody"),
  runTestBtn: document.getElementById("runTestBtn"),
  statusBadge: document.getElementById("statusBadge"),
  responseOutput: document.getElementById("responseOutput"),
};

const localStorageKey = "beepbeep.console.config";

init();

function init() {
  loadConfig();
  bindEvents();
  syncConfigToUI();
  refreshModeUI();
  setupGoogleAutoInit();
}

function bindEvents() {
  els.saveConfigBtn.addEventListener("click", () => {
    syncUIToConfig();
    saveConfig();
    renderResponse("Config saved locally.", 200);
  });

  els.cloudRunMode.addEventListener("change", () => {
    syncUIToConfig();
    saveConfig();
    refreshModeUI();
  });

  els.initGoogleBtn.addEventListener("click", () => {
    syncUIToConfig();
    initializeGoogleSignIn({ force: true });
  });

  els.googleClientId.addEventListener("change", () => {
    syncUIToConfig();
    saveConfig();
    initializeGoogleSignIn({ silent: true, force: true });
  });

  els.exchangeBtn.addEventListener("click", exchangeGoogleToken);

  els.poiForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = getPoiPayloadFromForm();
    const poiId = document.getElementById("poiId").value.trim();

    if (poiId) {
      await apiRequest("PUT", `/pois/${poiId}`, payload);
    } else {
      await apiRequest("POST", "/pois", payload);
    }

    await listPois();
  });

  els.clearPoiBtn.addEventListener("click", clearPoiForm);

  els.listPoisBtn.addEventListener("click", listPois);
  els.searchPoisBtn.addEventListener("click", searchPois);

  els.runTestBtn.addEventListener("click", runCustomRequest);
}

function loadConfig() {
  const raw = localStorage.getItem(localStorageKey);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.config = {
      ...state.config,
      ...parsed,
    };
  } catch (_err) {
    localStorage.removeItem(localStorageKey);
  }

  if (!state.config.googleClientId) {
    state.config.googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
  }
}

function saveConfig() {
  localStorage.setItem(localStorageKey, JSON.stringify(state.config));
}

function syncConfigToUI() {
  els.apiBaseUrl.value = state.config.apiBaseUrl;
  els.apiPrefix.value = state.config.apiPrefix;
  els.googleClientId.value = state.config.googleClientId;
  els.cloudRunMode.value = state.config.cloudRunMode;
  els.platformToken.value = state.config.platformToken;
  els.appToken.value = state.config.appToken;
  els.googleIdToken.value = state.googleIdToken;
}

function syncUIToConfig() {
  state.config.apiBaseUrl = els.apiBaseUrl.value.trim().replace(/\/$/, "");
  state.config.apiPrefix = normalizePrefix(els.apiPrefix.value.trim());
  state.config.googleClientId = els.googleClientId.value.trim();
  state.config.cloudRunMode = els.cloudRunMode.value;
  state.config.platformToken = els.platformToken.value.trim();
  state.config.appToken = els.appToken.value.trim();
}

function refreshModeUI() {
  const privateMode = els.cloudRunMode.value === "private";
  els.platformTokenWrap.classList.toggle("hidden", !privateMode);
}

function setupGoogleAutoInit() {
  waitForGoogleIdentity()
    .then(() => {
      initializeGoogleSignIn({ silent: true });
    })
    .catch(() => {
      renderResponse(
        {
          error: "Google script failed to load",
          message:
            "Sign-in script did not become ready. Check network and allow https://accounts.google.com.",
        },
        400,
      );
    });
}

function waitForGoogleIdentity(timeoutMs = 12000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id
      ) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Google Identity Services not ready"));
      }
    }, 100);
  });
}

function initializeGoogleSignIn(options = {}) {
  const { silent = false, force = false } = options;

  syncUIToConfig();

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    if (!silent) {
      renderResponse(
        "Google script not ready yet. Try again in a moment.",
        400,
      );
    }
    return;
  }

  if (!state.config.googleClientId) {
    if (!silent) {
      renderResponse("Google Client ID is required.", 400);
    }
    return;
  }

  if (!force && initializedGoogleClientId === state.config.googleClientId) {
    return;
  }

  els.googleButtonWrap.innerHTML = "";

  window.google.accounts.id.initialize({
    client_id: state.config.googleClientId,
    callback: (response) => {
      state.googleIdToken = response.credential || "";
      els.googleIdToken.value = state.googleIdToken;
      renderResponse(
        {
          message:
            "Google ID token captured. Click exchange to get session JWT.",
        },
        200,
      );
    },
  });

  window.google.accounts.id.renderButton(els.googleButtonWrap, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    width: 320,
  });

  initializedGoogleClientId = state.config.googleClientId;

  window.google.accounts.id.prompt();

  if (!silent) {
    renderResponse(
      {
        message:
          "Google Sign-In initialized. If popup is blocked, allow popups and try again.",
      },
      200,
    );
  }
}

async function exchangeGoogleToken() {
  syncUIToConfig();

  if (!state.googleIdToken) {
    renderResponse("No Google ID token available. Sign in first.", 400);
    return;
  }

  const response = await apiRequest("POST", "/auth/google", {
    idToken: state.googleIdToken,
  });

  if (response && response.token) {
    state.config.appToken = response.token;
    els.appToken.value = response.token;
    saveConfig();
  }
}

function normalizePrefix(prefix) {
  if (!prefix) return "/v1";
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

function buildHeaders(method, includeJsonBody) {
  const headers = {};
  const privateMode = state.config.cloudRunMode === "private";
  const normalizedPlatformToken = normalizeToken(state.config.platformToken);
  const normalizedAppToken = normalizeToken(state.config.appToken);

  if (privateMode) {
    if (normalizedPlatformToken) {
      headers.Authorization = `Bearer ${normalizedPlatformToken}`;
    }
    if (normalizedAppToken) {
      headers["X-Serverless-Authorization"] = `Bearer ${normalizedAppToken}`;
    }
  } else if (normalizedAppToken) {
    headers.Authorization = `Bearer ${normalizedAppToken}`;
  }

  if (includeJsonBody && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function apiRequest(method, path, body) {
  syncUIToConfig();
  saveConfig();

  const url = buildRequestUrl(path);
  const includeJsonBody = body !== undefined && body !== null;
  const headers = buildHeaders(method, includeJsonBody);

  try {
    const res = await fetch(url, {
      method,
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      headers,
      body: includeJsonBody ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload =
      res.status === 204
        ? { message: "No Content" }
        : isJson
          ? await res.json()
          : await res.text();

    renderResponse(payload, res.status);

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    return payload;
  } catch (error) {
    if (!String(error.message || "").includes("Request failed")) {
      renderResponse(buildNetworkErrorPayload(error, url, method, headers), 0);
    }
    return null;
  }
}

function normalizeToken(tokenValue) {
  const value = (tokenValue || "").trim();
  if (!value) return "";
  return value.replace(/^Bearer\s+/i, "").trim();
}

function buildNetworkErrorPayload(error, requestUrl, method, headers) {
  const requestOrigin = safeOrigin(requestUrl);
  const pageOrigin = window.location.origin;
  const isCrossOrigin = Boolean(requestOrigin && requestOrigin !== pageOrigin);

  const payload = {
    error: "Network error",
    message: String(error),
    likelyCause:
      isCrossOrigin && error instanceof TypeError
        ? "CORS or preflight blocked by API/Cloud Run"
        : "Browser could not reach endpoint (DNS/TLS/network/ad-block/CORS)",
    request: {
      method,
      url: requestUrl,
      pageOrigin,
      requestOrigin,
      cloudRunMode: state.config.cloudRunMode,
      sentHeaders: Object.keys(headers),
    },
    fixChecklist: [
      "Confirm API URL is reachable in browser: open /health directly",
      "Allow origin in backend CORS: Access-Control-Allow-Origin should include your Pages origin",
      "Allow headers in CORS: Authorization, X-Serverless-Authorization, Content-Type",
      "Allow methods in CORS: GET, POST, PUT, DELETE, OPTIONS",
      "If Cloud Run is private, ensure valid platform token is set",
    ],
  };

  if (window.location.hostname.endsWith("github.io")) {
    payload.fixChecklist.unshift(
      "For this Pages site, allow origin: https://karmetik.github.io",
    );
  }

  return payload;
}

function safeOrigin(urlValue) {
  try {
    return new URL(urlValue).origin;
  } catch (_err) {
    return "";
  }
}

function buildRequestUrl(path) {
  const rawPath = path.trim();
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const cleanedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const prefix = normalizePrefix(state.config.apiPrefix);

  if (cleanedPath === "/health" || cleanedPath.startsWith("/health?")) {
    return `${state.config.apiBaseUrl}${cleanedPath}`;
  }

  if (
    cleanedPath === prefix ||
    cleanedPath.startsWith(`${prefix}/`) ||
    cleanedPath.startsWith(`${prefix}?`)
  ) {
    return `${state.config.apiBaseUrl}${cleanedPath}`;
  }

  return `${state.config.apiBaseUrl}${prefix}${cleanedPath}`;
}

function getPoiPayloadFromForm() {
  const parseArrayField = (id) => {
    const raw = document.getElementById(id).value.trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (_err) {
      return [];
    }
  };

  const payload = {
    name: document.getElementById("name").value.trim(),
    latitude: Number(document.getElementById("latitude").value),
    longitude: Number(document.getElementById("longitude").value),
    isKidFriendly: document.getElementById("isKidFriendly").value === "true",
    subtitle: nullable(document.getElementById("subtitle").value),
    description: nullable(document.getElementById("description").value),
    story: nullable(document.getElementById("story").value),
    category: nullable(document.getElementById("category").value),
    rating: optionalNumber(document.getElementById("rating").value),
    openingHours: nullable(document.getElementById("openingHours").value),
    phoneNumber: nullable(document.getElementById("phoneNumber").value),
    website: nullable(document.getElementById("website").value),
    imageURLs: parseArrayField("imageURLs"),
    tags: parseArrayField("tags"),
  };

  return removeUndefined(payload);
}

function nullable(value) {
  const v = value.trim();
  return v ? v : null;
}

function optionalNumber(value) {
  const v = value.trim();
  if (!v) return undefined;
  return Number(v);
}

function removeUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
}

async function listPois() {
  const params = new URLSearchParams();
  const category = els.categoryFilter.value.trim();
  if (category) params.set("category", category);

  const path = params.toString() ? `/pois?${params.toString()}` : "/pois";
  const data = await apiRequest("GET", path);

  if (data && Array.isArray(data.pois)) {
    state.pois = data.pois;
    renderPoiTable();
  }
}

async function searchPois() {
  const q = els.searchQuery.value.trim();
  if (!q) {
    renderResponse("Search query is required.", 400);
    return;
  }

  const params = new URLSearchParams({ q });
  const data = await apiRequest("GET", `/pois/search?${params.toString()}`);

  if (data && Array.isArray(data.pois)) {
    state.pois = data.pois;
    renderPoiTable();
  }
}

function renderPoiTable() {
  els.poiTableBody.innerHTML = "";

  for (const poi of state.pois) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(poi.name || "")}</td>
      <td>${escapeHtml(poi.category || "-")}</td>
      <td>${poi.isKidFriendly ? "true" : "false"}</td>
      <td>${poi.rating ?? "-"}</td>
      <td></td>
    `;

    const actionsCell = tr.lastElementChild;

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Load";
    loadBtn.className = "secondary";
    loadBtn.addEventListener("click", () => {
      fillPoiForm(poi);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", async () => {
      if (!poi.id) return;
      await apiRequest("DELETE", `/pois/${poi.id}`);
      await listPois();
    });

    const getBtn = document.createElement("button");
    getBtn.textContent = "Get";
    getBtn.className = "secondary";
    getBtn.addEventListener("click", async () => {
      if (!poi.id) return;
      await apiRequest("GET", `/pois/${poi.id}`);
    });

    actionsCell.appendChild(loadBtn);
    actionsCell.appendChild(getBtn);
    actionsCell.appendChild(deleteBtn);

    els.poiTableBody.appendChild(tr);
  }
}

function fillPoiForm(poi) {
  document.getElementById("poiId").value = poi.id || "";
  document.getElementById("name").value = poi.name || "";
  document.getElementById("latitude").value = poi.latitude ?? "";
  document.getElementById("longitude").value = poi.longitude ?? "";
  document.getElementById("isKidFriendly").value = poi.isKidFriendly
    ? "true"
    : "false";
  document.getElementById("subtitle").value = poi.subtitle || "";
  document.getElementById("description").value = poi.description || "";
  document.getElementById("story").value = poi.story || "";
  document.getElementById("category").value = poi.category || "";
  document.getElementById("rating").value = poi.rating ?? "";
  document.getElementById("openingHours").value = poi.openingHours || "";
  document.getElementById("phoneNumber").value = poi.phoneNumber || "";
  document.getElementById("website").value = poi.website || "";
  document.getElementById("imageURLs").value = JSON.stringify(
    poi.imageURLs || [],
  );
  document.getElementById("tags").value = JSON.stringify(poi.tags || []);
}

function clearPoiForm() {
  els.poiForm.reset();
  document.getElementById("poiId").value = "";
  document.getElementById("isKidFriendly").value = "true";
}

async function runCustomRequest() {
  const method = els.testMethod.value;
  const path = els.testPath.value.trim() || "/pois";
  const rawBody = els.testBody.value.trim();

  let body;
  if (rawBody && method !== "GET" && method !== "DELETE") {
    try {
      body = JSON.parse(rawBody);
    } catch (_err) {
      renderResponse("Invalid JSON body.", 400);
      return;
    }
  }

  await apiRequest(method, path, body);
}

function renderResponse(payload, statusCode) {
  const label = statusCode === 0 ? "Network Error" : `HTTP ${statusCode}`;

  els.statusBadge.textContent = label;
  els.statusBadge.classList.remove("ok", "error");

  if (statusCode >= 200 && statusCode < 300) {
    els.statusBadge.classList.add("ok");
  } else if (statusCode >= 400 || statusCode === 0) {
    els.statusBadge.classList.add("error");
  }

  if (typeof payload === "string") {
    els.responseOutput.textContent = payload;
    return;
  }

  els.responseOutput.textContent = JSON.stringify(payload, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
