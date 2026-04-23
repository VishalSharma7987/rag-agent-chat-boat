import React, { useState, useEffect, useCallback } from 'react';
import { getFiles, deleteFile, clearAllFiles } from '../services/api';

/**
 * DocumentDrawer
 *
 * Slide-in right-sidebar showing all indexed PDFs.
 * Features:
 *   - Live count badge
 *   - Per-file delete with per-row loading spinner
 *   - Delete All with confirmation
 *   - Toast notifications for success / error
 *   - Refresh triggered externally via refreshTick prop
 *
 * Props:
 *   isOpen      {boolean}
 *   onClose     {() => void}
 *   refreshTick {number}   — increment to trigger a list reload (from parent)
 *   onUploadClick {() => void} — opens the upload modal from the drawer
 */
const DocumentDrawer = ({ isOpen, onClose, refreshTick = 0, onUploadClick }) => {
  const [files, setFiles]           = useState([]);
  const [count, setCount]           = useState(0);
  const [isLoading, setIsLoading]   = useState(false);
  const [deletingFiles, setDeletingFiles] = useState(new Set()); // per-file loading
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [toast, setToast]           = useState(null); // { type: 'success'|'error', message: string }

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch file list ───────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFiles();
      setFiles(data.files || []);
      setCount(data.count || 0);
    } catch {
      showToast('error', 'Failed to load document list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload when drawer opens or when parent signals a new upload
  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen, refreshTick, fetchFiles]);

  // ── Delete single file ────────────────────────────────────────────────────
  const handleDelete = async (fileName) => {
    setDeletingFiles((prev) => new Set(prev).add(fileName));
    try {
      await deleteFile(fileName);
      showToast('success', `"${fileName}" removed.`);
      await fetchFiles();
    } catch {
      showToast('error', `Failed to delete "${fileName}".`);
    } finally {
      setDeletingFiles((prev) => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
    }
  };

  // ── Delete all files ──────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL indexed documents? This cannot be undone.')) return;
    setIsClearingAll(true);
    try {
      await clearAllFiles();
      showToast('success', 'All documents cleared from Pinecone.');
      await fetchFiles();
    } catch {
      showToast('error', 'Failed to clear all documents.');
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ── */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800">Indexed Documents</h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                count > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">PDFs currently in Pinecone</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`mx-4 mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
            {toast.message}
          </div>
        )}

        {/* ── File list ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              <p className="text-sm text-gray-400">Loading documents…</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No documents yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload a PDF to get started</p>
              </div>
            </div>
          ) : (
            files.map((file, idx) => {
              const isDeleting = deletingFiles.has(file);
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between bg-gray-50 p-3 rounded-xl border transition-all duration-200 ${
                    isDeleting
                      ? 'opacity-50 border-gray-100'
                      : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate" title={file}>
                      {file}
                    </span>
                  </div>

                  {/* Per-file delete button / spinner */}
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 flex-shrink-0 ml-2" />
                  ) : (
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 ml-2"
                      title={`Delete ${file}`}
                      aria-label={`Delete ${file}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* Upload button */}
          <button
            id="drawer-upload-btn"
            onClick={onUploadClick}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload PDF
          </button>

          {/* Delete all — only shown when files exist */}
          {files.length > 0 && (
            <button
              id="drawer-clear-all-btn"
              onClick={handleClearAll}
              disabled={isClearingAll}
              className={`w-full py-2.5 px-4 font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                isClearingAll
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              {isClearingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                  Clearing…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All Documents
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentDrawer;
