import React, { useState, useRef } from 'react';
import { uploadPDF } from '../services/api';

/**
 * UploadModal
 *
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   onUploadDone {() => void}  — called after a successful upload so the
 *                               document list can refresh automatically
 */
const UploadModal = ({ isOpen, onClose, onUploadDone }) => {
  const [file, setFile]           = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus]       = useState({ type: '', message: '' });
  const inputRef = useRef(null);

  // BASE_URL is now centralised in api.js — no local URL needed

  const resetState = () => {
    setFile(null);
    setStatus({ type: '', message: '' });
    setIsDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
    } else if (selectedFile) {
      setFile(null);
      setStatus({ type: 'error', message: 'Please select a valid PDF file.' });
    }
  };

  const handleInputChange = (e) => handleFileChange(e.target.files[0]);

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    try {
      const data = await uploadPDF(file);
      setStatus({ type: 'success', message: data.message || 'PDF uploaded and indexed successfully!' });
      setFile(null);
      if (typeof onUploadDone === 'function') onUploadDone();
      setTimeout(() => { handleClose(); }, 2000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Connection error. Is the backend running?' });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Upload PDF</h2>
              <p className="text-sm text-gray-500 mt-0.5">Index a document for AI retrieval</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging          ? 'border-emerald-400 bg-emerald-50'
                : file             ? 'border-emerald-500 bg-emerald-50'
                :                    'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                id="pdf-upload"
                className="hidden"
                onChange={handleInputChange}
              />

              {/* Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                file ? 'bg-emerald-100' : 'bg-gray-100'
              }`}>
                {file ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
              </div>

              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Click or drag & drop a PDF'}
              </p>
              {file ? (
                <p className="text-xs text-emerald-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">PDF files only · max 50 MB</p>
              )}
            </div>

            {/* Status message */}
            {status.message && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {status.type === 'success'
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                  }
                </svg>
                {status.message}
              </div>
            )}

            {/* Upload button */}
            <button
              id="upload-submit-btn"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                !file || isUploading
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-200'
              }`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading…
                </span>
              ) : 'Start Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
