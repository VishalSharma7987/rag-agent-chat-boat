import React from 'react';

const UploadButton = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-300"
      title="Upload PDF"
    >
      <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-45 text-emerald-600' : 'rotate-0'}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    </button>
  );
};

export default UploadButton;
