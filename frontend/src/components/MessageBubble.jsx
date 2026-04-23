import React from 'react';

const MessageBubble = ({ message, isBot, timestamp }) => {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed relative ${isBot
          ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
          : 'bg-emerald-600 text-white rounded-br-sm'
          }`}
      >
        <span className="break-words whitespace-pre-wrap">{message}</span>
        {/* <div className="break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: message }} /> */}

        {formattedTime && (
          <span className={`text-[10px] block mt-1.5 font-medium text-right ${isBot ? 'text-gray-400' : 'text-emerald-200'}`}>
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
