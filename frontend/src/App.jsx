import React, { useState } from 'react';
import ChatBox from './components/ChatBox';
import InputBar from './components/InputBar';
import UploadButton from './components/UploadButton';
import UploadModal from './components/UploadModal';
import DocumentDrawer from './components/DocumentDrawer';
import { sendMessage } from './services/api';
import VoiceOutput from './components/voice/VoiceOutput';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDocumentDrawerOpen, setIsDocumentDrawerOpen] = useState(false);
  // Incrementing this tells DocumentDrawer to re-fetch the file list
  const [docRefreshTick, setDocRefreshTick] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const handleClearChat = async () => {
    setIsClearing(true);

    // smooth frame delay (better than setTimeout)
    await new Promise((res) => setTimeout(res, 400));

    setMessages([]);
    setIsClearing(false);
  };

  const triggerDocRefresh = () => setDocRefreshTick((t) => t + 1);

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

      if (isVoiceEnabled) {
        VoiceOutput.speak(answer);
      }
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

  const handleVoiceInput = async (text) => {
    // This calls the same logic as handleSendMessage but ensures voice output is triggered
    // (Existing handleSendMessage already has voice output logic now, but we'll follow the requested flow)
    await handleSendMessage(text);
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col md:items-center md:justify-center md:p-6 font-sans">
      <div className="w-full max-w-4xl bg-white md:shadow-2xl md:rounded-3xl overflow-hidden flex flex-col h-[100dvh] md:h-[85vh] border-0 md:border md:border-gray-200">

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
            {/* Documents panel trigger */}
            <button
              id="open-documents-btn"
              onClick={() => setIsDocumentDrawerOpen(true)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
              title="Manage Documents"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </button>

            {/* Upload button */}
            <UploadButton
              isOpen={isUploadModalOpen}
              onClick={() => setIsUploadModalOpen(!isUploadModalOpen)}
            />
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

            {/* Voice Toggle */}
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-full transition-all duration-300 ${
                isVoiceEnabled 
                  ? "bg-emerald-100 text-emerald-600 shadow-inner" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title={isVoiceEnabled ? "Mute Output" : "Enable Voice Output"}
            >
              {isVoiceEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 4.5 4.5 0 010 6.364.75.75 0 01-1.06-1.06 3 3 0 000-4.242.75.75 0 010-1.061z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.439 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.561 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* ── Chat Area ── */}
        <ChatBox messages={messages} isLoading={isLoading} />

        {/* ── Input ── */}
        <InputBar onSend={handleSendMessage} onVoice={handleVoiceInput} disabled={isLoading} />
      </div>

      {/* ── Upload Modal ── */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadDone={() => {
          triggerDocRefresh();         // refresh drawer list
          setIsUploadModalOpen(false); // close modal
        }}
      />

      {/* ── Document Drawer ── */}
      <DocumentDrawer
        isOpen={isDocumentDrawerOpen}
        onClose={() => setIsDocumentDrawerOpen(false)}
        refreshTick={docRefreshTick}
        onUploadClick={() => {
          setIsDocumentDrawerOpen(false); // close drawer first
          setIsUploadModalOpen(true);     // then open upload modal
        }}
      />
    </div>
  );
};

export default App;
