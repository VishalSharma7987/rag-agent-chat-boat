import React, { useState } from 'react';
import ChatBox from './components/ChatBox';
import InputBar from './components/InputBar';
import { sendMessage } from './services/api';
import ReferenceDocument from './components/ReferenceDocument';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const handleClearChat = async () => {
    setIsClearing(true);

    // smooth frame delay (better than setTimeout)
    await new Promise((res) => setTimeout(res, 400));

    setMessages([]);
    setIsClearing(false);
  };

  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      text,
      isBot: false,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const answer = await sendMessage(text);

      const botMessage = {
        id: Date.now() + 1,
        text: answer,
        isBot: true,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't reach the server. Please check your connection and try again.",
        isBot: true,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col md:items-center md:justify-center md:p-6 font-sans">
      <div className="w-full max-w-6xl bg-white md:shadow-2xl md:rounded-3xl overflow-hidden flex flex-col h-[100dvh] md:h-[85vh] border-0 md:border md:border-gray-200">

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-100 p-4 px-6 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] z-10 transition-all">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">DocGuide AI Assistant</h1>
              <p className="text-sm text-emerald-600 font-medium flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                Online
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* refresh button */}
            <button
              onClick={handleClearChat}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Clear chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`w-5 h-5 ${isClearing ? "animate-spin" : ""
                  }`}
              >
                <path d="M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V7a5 5 0 11-5 5H5a7 7 0 107-7c1.93 0 3.68.78 4.95 2.05l.7-.7z" />
              </svg>
            </button>

          </div>
        </header>

        {/* ── Main Content Area (Two Columns) ── */}
        <div className="flex-1 flex lg:flex-row flex-col-reverse overflow-hidden bg-gray-50/30">
          
          {/* Left Column: Chat Area */}
          <div className="lg:w-[70%] w-full flex flex-col h-full bg-white relative">
            <ChatBox messages={messages} isLoading={isLoading} />
            <InputBar onSend={handleSendMessage} disabled={isLoading} />
          </div>

          {/* Right Column: Reference Sidebar */}
          <ReferenceDocument />
        </div>
      </div>

    </div>
  );
};

export default App;
