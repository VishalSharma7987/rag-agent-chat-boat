/**
 * API Service
 *
 * Single source of truth for the backend base URL.
 * VITE_API_URL may be set to either:
 *   - "http://localhost:3000"        (base URL)
 *   - "http://localhost:3000/chat"   (legacy — the /chat suffix is stripped)
 *
 * All functions derive endpoint paths from BASE_URL so there is
 * no hardcoding of host/port anywhere else in the frontend.
 */

const RAW_URL  = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE_URL = RAW_URL.replace(/\/chat\/?$/, ''); // strip trailing /chat if present

// ── Chat ─────────────────────────────────────────────────────────────────────

export const sendMessage = async (message) => {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: message }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.answer;
};

// ── Documents ─────────────────────────────────────────────────────────────────

/** GET /files → { count, files } */
export const getFiles = async () => {
  const response = await fetch(`${BASE_URL}/files`);
  if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`);
  return response.json();
};

/** POST /upload → stream a PDF via multipart */
export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
};

/** DELETE /files/delete-file  { fileName } */
export const deleteFile = async (fileName) => {
  const response = await fetch(`${BASE_URL}/files/delete-file`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete file');
  return data;
};

/** POST /files/clear-all */
export const clearAllFiles = async () => {
  const response = await fetch(`${BASE_URL}/files/clear-all`, {
    method: 'POST',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to clear files');
  return data;
};
