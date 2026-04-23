'use strict';

/**
 * Document Service
 *
 * Persists the list of uploaded PDF file names to disk so that
 * the registry survives server restarts.
 *
 * Storage: <project-root>/storage/files.json
 * Format:  ["file1.pdf", "file2.pdf"]
 */

const fs   = require('fs');
const path = require('path');

const STORAGE_PATH = path.resolve(__dirname, '../../storage/files.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Read the file list from disk. Returns [] on any error. */
function _readFiles() {
  try {
    const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist the provided array to disk (atomic-ish write). */
function _writeFiles(files) {
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(files, null, 2), 'utf8');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a file name to the registry (no duplicates).
 * @param {string} filename
 */
function addFile(filename) {
  const files = _readFiles();
  const unique = Array.from(new Set([...files, filename]));
  _writeFiles(unique);
}

/**
 * Remove a single file from the registry.
 * @param {string} filename
 */
function removeFile(filename) {
  const files = _readFiles().filter((f) => f !== filename);
  _writeFiles(files);
}

/**
 * Clear the entire registry.
 */
function clearAllFiles() {
  _writeFiles([]);
}

/**
 * Return all tracked file names.
 * @returns {string[]}
 */
function getAllFiles() {
  return _readFiles();
}

/**
 * Return the number of tracked files.
 * @returns {number}
 */
function getFileCount() {
  return _readFiles().length;
}

module.exports = {
  addFile,
  removeFile,
  clearAllFiles,
  getAllFiles,
  getFileCount,
};
