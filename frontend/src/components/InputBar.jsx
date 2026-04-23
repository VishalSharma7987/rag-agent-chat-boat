import React, { useState } from 'react';
import VoiceInput from './voice/VoiceInput';

const InputBar = ({ onSend, onVoice, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white px-4 py-4 md:px-8 border-t border-gray-100 w-full rounded-b-2xl">
      <form onSubmit={handleSubmit} className="relative flex items-center shadow-sm rounded-2xl bg-gray-50 border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all duration-300">
        <textarea
          className="w-full bg-transparent border-none px-6 py-4 outline-none text-gray-700 placeholder-gray-400 font-medium resize-none min-h-[56px] max-h-32"
          placeholder="Message AI Assistant..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <div className="absolute right-2 bottom-2 flex items-center space-x-2">
          <VoiceInput onResult={onVoice || onSend} disabled={disabled} />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="p-2.5 text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-xl transition-colors flex items-center justify-center shadow-md active:scale-95 disabled:active:scale-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 translate-x-[-1px] translate-y-[1px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputBar;
