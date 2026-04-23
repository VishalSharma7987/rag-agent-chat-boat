import React from 'react';

const ReferenceDocument = () => {
  return (
    <div className="lg:w-[30%] w-full bg-white lg:border-l border-gray-100 flex flex-col h-full overflow-y-auto">
      <div className="p-5 flex flex-col h-full">
        <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 tracking-tight text-lg">
              📄 Reference Document
            </h3>
          </div>

          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Current File</p>
            <p className="text-gray-800 font-semibold truncate">
              Employee Policy Manual.pdf
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              This document contains company policies, employee guidelines, and operational rules. You can explore it to better understand how the assistant answers your questions.
            </p>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <a
              href="/docs/Sample.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all duration-300 active:scale-[0.98]"
            >
              View PDF
            </a>
            <a
              href="/docs/Sample.pdf"
              download="Employee Policy Manual.pdf"
              className="w-full text-center px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition-all duration-300 active:scale-[0.98] shadow-emerald-200"
            >
              Download PDF
            </a>
          </div>
        </div>

        {/* Decorative element for sidebar bottom */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-[10px] text-gray-400 font-medium tracking-[0.2em] uppercase opacity-50">
            Powered by RAG Engine
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferenceDocument;
