const TOKEN_KEY = "vizzel_demo_token";
const USER_KEY = "vizzel_demo_user";

const loginPanel = document.getElementById("login-panel");
const assetsPanel = document.getElementById("assets-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const assetsBody = document.getElementById("assets-body");
const loadMoreBtn = document.getElementById("load-more");
const userInfo = document.getElementById("user-info");
const healthStatus = document.getElementById("health-status");

let nextCursor = null;

async function checkHealth() {
  try {
    const res = await fetch("/api/v1/health");
    const data = await res.json();
    healthStatus.textContent = `API ${data.status} · DB ${data.db}`;
  } catch {
    healthStatus.textContent = "API unreachable";
  }
}

function showAssetsUI(user) {
  loginPanel.classList.add("hidden");
  assetsPanel.classList.remove("hidden");
  userInfo.textContent = `${user.display_name || user.email} · org #${user.organization_id}`;
}

function showLoginUI() {
  assetsPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  assetsBody.innerHTML = "";
  nextCursor = null;
  loadMoreBtn.classList.add("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    loginError.textContent = data.error || "login failed";
    loginError.classList.remove("hidden");
    return;
  }
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  showAssetsUI(data.user);
  await loadAssets(true);
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showLoginUI();
});

loadMoreBtn.addEventListener("click", () => loadAssets(false));

async function loadAssets(reset) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (reset) {
    assetsBody.innerHTML = "";
    nextCursor = null;
  }
  const params = new URLSearchParams({ limit: "20" });
  if (nextCursor) params.set("cursor", nextCursor);
  const res = await fetch(`/api/v1/assets?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) showLoginUI();
    return;
  }
  for (const row of data.data || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.asset_number}</td><td>${row.asset_name}</td><td>${row.asset_value.toLocaleString()}</td><td>${row.status}</td>`;
    assetsBody.appendChild(tr);
  }
  nextCursor = data.next_cursor || null;
  if (data.has_more) loadMoreBtn.classList.remove("hidden");
  else loadMoreBtn.classList.add("hidden");
}

(function init() {
  checkHealth();
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (token && userRaw) {
    showAssetsUI(JSON.parse(userRaw));
    loadAssets(true);
  }
})();
