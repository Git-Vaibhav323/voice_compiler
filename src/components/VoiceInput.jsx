import { useEffect, useState } from "react";
import {
  FiMic,
  FiMicOff,
  FiZap,
  FiAlertCircle,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

const SUGGESTIONS = [
  "Write a bubble sort in C",
  "Write a program to check if a number is prime",
  "Write a C program to find the factorial of a number",
  "Write a linear search program in C",
  "Write a C program to reverse an array",
];

const VoiceInput = ({ onGenerate, generating, generationError, backend }) => {
  const [request, setRequest] = useState("");

  const {
    supported,
    listening,
    transcript,
    interim,
    error: speechError,
    toggle,
    reset,
  } = useSpeechRecognition();

  // Mirror the live transcript into the text box so the user can correct it.
  useEffect(() => {
    if (transcript) setRequest(transcript);
  }, [transcript]);

  const handleGenerate = () => {
    const text = request.trim();
    if (!text || generating) return;
    onGenerate(text);
  };

  const handleClear = () => {
    setRequest("");
    reset();
  };

  const backendReady = backend.online && backend.hasApiKey;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 mb-6">
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-2 rounded-xl mr-3">
          <FiMic className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-800">
            Voice Request
          </h2>
          <p className="text-xs md:text-sm text-slate-600">
            Describe the program you want and the AI will write the C code
          </p>
        </div>
      </div>

      {/* Backend status */}
      {!backendReady && (
        <div className="flex items-start bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2.5 rounded-xl mb-4">
          <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm">
            {!backend.online
              ? "The backend is not reachable. Start it with npm run server, then reload."
              : "The backend has no GROQ_API_KEY set. Add one to your .env file to enable code generation."}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={listening && interim ? `${request} ${interim}` : request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder={
              supported
                ? "Tap the mic and speak, or type your request here"
                : "Type your request here (voice input is not supported in this browser)"
            }
            className={`outline-none w-full py-3 pl-4 pr-10 text-sm md:text-base rounded-xl border-2 transition-all
              ${
                listening
                  ? "border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-200"
                  : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
          />
          {request && (
            <button
              onClick={handleClear}
              title="Clear request"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggle}
            disabled={!supported}
            title={
              supported
                ? listening
                  ? "Stop listening"
                  : "Start listening"
                : "Voice input is not supported in this browser"
            }
            className={`flex items-center justify-center font-medium py-3 px-4 rounded-xl transition-all shadow-md flex-1 sm:flex-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
              ${
                listening
                  ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
          >
            {listening ? (
              <FiMicOff className="w-4 h-4" />
            ) : (
              <FiMic className="w-4 h-4" />
            )}
            <span className="ml-2 text-sm">
              {listening ? "Listening..." : "Speak"}
            </span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating || !request.trim() || !backendReady}
            className="flex items-center justify-center bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-medium py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex-1 sm:flex-none cursor-pointer"
          >
            {generating ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiZap className="w-4 h-4" />
            )}
            <span className="ml-2 text-sm">
              {generating ? "Writing..." : "Generate"}
            </span>
          </button>
        </div>
      </div>

      {/* Live transcript feedback */}
      {listening && (
        <div className="flex items-center text-xs md:text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          <span className="flex h-2 w-2 relative mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          {interim ? `Hearing: ${interim}` : "Listening. Start speaking..."}
        </div>
      )}

      {speechError && (
        <div className="flex items-start bg-red-50 border border-red-200 text-red-800 px-3 py-2.5 rounded-xl mb-3">
          <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm">{speechError}</p>
        </div>
      )}

      {generationError && (
        <div className="flex items-start bg-red-50 border border-red-200 text-red-800 px-3 py-2.5 rounded-xl mb-3">
          <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm">{generationError}</p>
        </div>
      )}

      {!supported && (
        <p className="text-xs text-slate-500 mb-3">
          Voice input needs the Web Speech API, available in Chrome, Edge and
          Safari. You can still type your request above.
        </p>
      )}

      {/* Suggestions */}
      <div className="border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500 mb-2">Try saying:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setRequest(suggestion)}
              className="text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-slate-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
