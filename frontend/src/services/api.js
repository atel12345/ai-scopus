/**
 * api.js - Service centralise pour communiquer avec le backend FastAPI.
 *
 * L'URL du backend est lue depuis une variable d'environnement React
 * (REACT_APP_API_URL), definie dans .env (local) ou dans les variables
 * d'environnement de la plateforme de deploiement (Render/Vercel/etc.).
 */
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "scopus_agent_token";

function getResponseFilename(disposition, fallback = "rapport_bibliometrique.xlsx") {
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) return decodeURIComponent(encodedMatch[1]);

  const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
  return standardMatch ? standardMatch[1] : fallback;
}

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}
export function isAuthenticated() {
  return !!getToken();
}

export function getCurrentUserEmail() {
  const token = getToken();
  if (!token) return "";

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(payload)).sub || "";
  } catch {
    return "";
  }
}

/**
 * Inscription d'un nouvel utilisateur.
 * Correspond a POST /auth/register (email + password en JSON).
 */
export async function registerUser(email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Erreur lors de l'inscription");
  }
  return data;
}

/**
 * Connexion. Correspond a POST /auth/login, qui attend un format
 * form-data (OAuth2PasswordRequestForm cote FastAPI), pas du JSON.
 */
export async function loginUser(email, password) {
  const formBody = new URLSearchParams();
  formBody.append("username", email);
  formBody.append("password", password);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Email ou mot de passe incorrect");
  }
  saveToken(data.access_token);
  return data;
}

export function logoutUser() {
  clearToken();
}

/**
 * Lance la generation du rapport bibliometrique.
 * Correspond a POST /pipeline/generate (protege par JWT).
 *
 * Retourne le blob du fichier Excel a telecharger, pas du JSON,
 * car l'endpoint FastAPI renvoie un FileResponse.
 */
export async function generateReport(scopusLinkOrId, authorName) {
  const token = getToken();
  if (!token) {
    throw new Error("Vous devez etre connecte pour generer un rapport");
  }
  const response = await fetch(`${API_URL}/pipeline/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      scopus_link_or_id: scopusLinkOrId,
      author_name: authorName,
    }),
  });
  if (!response.ok) {
    let detail = "Erreur lors de la generation du rapport";
    try {
      const errData = await response.json();
      detail = errData.detail || detail;
    } catch {
      // reponse non-JSON (ex: erreur serveur brute), on garde le message par defaut
    }
    if (response.status === 401) {
      clearToken();
    }
    throw new Error(detail);
  }
  // Extrait le nom de fichier propose par le serveur (Content-Disposition)
  const disposition = response.headers.get("Content-Disposition") || "";
  const filename = getResponseFilename(disposition);
  const blob = await response.blob();
  return { blob, filename };
}

async function authorizedFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Vous devez etre connecte pour generer un rapport");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let detail = "Erreur lors de la communication avec le serveur";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // Le serveur peut retourner une reponse vide en cas d'erreur.
    }
    if (response.status === 401) clearToken();
    throw new Error(detail);
  }
  return response;
}

export async function startGenerateReport(scopusLinkOrId, authorName) {
  const response = await authorizedFetch("/pipeline/generate-async", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopus_link_or_id: scopusLinkOrId, author_name: authorName }),
  });
  return response.json();
}

export async function getJobStatus(jobId) {
  const response = await authorizedFetch(`/pipeline/status/${jobId}`);
  return response.json();
}

export async function downloadJobResult(jobId, fallbackFilename) {
  const response = await authorizedFetch(`/pipeline/download/${jobId}`);
  const disposition = response.headers.get("Content-Disposition") || "";
  return {
    blob: await response.blob(),
    filename: getResponseFilename(disposition, fallbackFilename),
  };
}

/**
 * Declenche le telechargement du fichier Excel dans le navigateur.
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
