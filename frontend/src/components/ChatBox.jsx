import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatBox = ({ messages, isLoading }) => {
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 w-full bg-[#fcfcfc] p-4 md:p-6 overflow-y-auto w-full scroll-smooth">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-5">
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-100 to-emerald-50 rounded-full flex items-center justify-center shadow-sm border border-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-emerald-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">How can I help you today?</h2>
            <p className="text-gray-500 mt-2 text-lg">Uplode PDF to start the conversation.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg.text} isBot={msg.isBot} timestamp={msg.timestamp} />
          ))}

          {isLoading && (
            <div className="flex w-full justify-start mb-4">
              <div className="bg-white border border-gray-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} className="h-2" />
        </div>
      )}
    </div>
  );
};

export default ChatBox;
