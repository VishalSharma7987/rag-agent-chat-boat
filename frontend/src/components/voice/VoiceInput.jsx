import React from 'react';
import useVoice from './useVoice';

const VoiceInput = ({ onResult, disabled }) => {
  const { isListening, startListening, stopListening, isSupported } = useVoice(onResult);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50 ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      title={isListening ? 'Stop listening' : 'Start voice input'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        {isListening ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 9h6v6H9V9z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        )}
      </svg>
      {isListening && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </button>
  );
};

export default VoiceInput;
