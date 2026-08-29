import { useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router";
import {
  FiCode,
  FiCpu,
  FiLayers,
  FiAlertTriangle,
  FiInfo,
  FiHome,
  FiHelpCircle,
  FiGithub,
  FiMic,
} from "react-icons/fi";
import CodeInput from "./components/CodeInput";
import VoiceInput from "./components/VoiceInput";
import PhaseVisualization from "./components/PhaseVisualization";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import { useCompiler } from "./hooks/useCompiler";

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    int price = 40;
    int rate = 3;
    int total = price + rate * 60;
    printf("%d", total);
    return 0;
}`;

const CompilerVisualizer = () => {
  const [code, setCode] = useState(DEFAULT_CODE);

  const {
    phases,
    loading,
    error,
    usingFallback,
    analyzeCode,
    generating,
    generationError,
    generateCode,
    backend,
  } = useCompiler();

  const handleAnalyze = useCallback(() => analyzeCode(code), [analyzeCode, code]);

  /**
   * Spoken request -> generated C -> straight into the analysis, so one
   * sentence gets you all the way to the phases.
   */
  const handleGenerate = useCallback(
    async (request) => {
      const generated = await generateCode(request);
      if (!generated) return;

      setCode(generated);
      await analyzeCode(generated);

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [generateCode, analyzeCode]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        <nav className="flex flex-col md:flex-row md:justify-between items-center mb-6 md:mb-8 gap-3 md:gap-0">
          <Link
            to="/"
            className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow w-full md:w-auto justify-center md:justify-start"
          >
            <div className="size-9 md:size-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
              <FiMic className="size-5 md:size-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Voice Compiler Visualizer
              </h1>
              <p className="text-xs md:text-sm text-slate-600 hidden md:block">
                Speak a program, watch and hear it compile
              </p>
            </div>
          </Link>

          <div className="flex gap-2 w-full md:w-auto justify-center md:justify-start">
            <Link
              to="/"
              className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200 hover:bg-gray-100 transition-colors hover:cursor-pointer flex-1 md:flex-none justify-center"
            >
              <FiHome className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
              <span className="ml-2 text-slate-700 hidden sm:block">Home</span>
            </Link>
            <Link
              to="/how-it-works"
              className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200 hover:bg-gray-100 transition-colors hover:cursor-pointer flex-1 md:flex-none justify-center"
            >
              <FiHelpCircle className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
              <span className="ml-2 text-slate-700 hidden sm:block">Guide</span>
            </Link>

            <a
              href="https://github.com/danielace1/compiler-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center bg-gray-800 text-white rounded-xl p-3 shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              <FiGithub className="w-5 h-5" />
              <span className="ml-2 font-medium">Repo</span>
            </a>
          </div>
        </nav>

        {/* Status Indicators */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3 md:mb-6">
          {usingFallback && (
            <div className="flex items-center bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
              <FiAlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">
                Analyzed with the built-in offline parser. Start the backend with
                an API key for richer AI analysis.
              </span>
            </div>
          )}

          {loading && (
            <div className="flex items-center bg-blue-100 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Analyzing your code...</span>
            </div>
          )}
        </div>

        {/* Quick Info Section */}
        {!phases && !loading && (
          <div className="bg-white rounded-2xl p-3 md:p-6 shadow-sm border border-slate-200 mb-6">
            <div className="flex items-center mb-4">
              <FiInfo className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-800">Quick Start</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 mb-4">
              <div className="flex items-center">
                <div className="bg-rose-100 p-2 rounded-lg mr-3 flex-shrink-0">
                  <FiMic className="w-4 h-4 text-rose-600" />
                </div>
                <p>Speak a request like "write a bubble sort in C"</p>
              </div>
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                  <FiCode className="w-4 h-4 text-blue-600" />
                </div>
                <p>The AI writes the code and runs it through the phases</p>
              </div>
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg mr-3 flex-shrink-0">
                  <FiCpu className="w-4 h-4 text-purple-600" />
                </div>
                <p>Click any phase to hear it explained aloud</p>
              </div>
            </div>
            <div className="text-center">
              <Link
                to="/how-it-works"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <FiHelpCircle className="w-4 h-4 mr-1" />
                Learn more about how it works
              </Link>
            </div>
          </div>
        )}

        {/* Voice Request Section */}
        <VoiceInput
          onGenerate={handleGenerate}
          generating={generating}
          generationError={generationError}
          backend={backend}
        />

        {/* Code Input Section */}
        <CodeInput
          code={code}
          onChange={setCode}
          onAnalyze={handleAnalyze}
          loading={loading}
        />

        {/* Error Display */}
        {error && (
          <div className="flex items-center bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6">
            <FiAlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Compilation Phases */}
        {phases && (
          <div className="mt-6 mb-10">
            <div className="flex items-center mb-4">
              <FiLayers className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mr-2" />
              <h2 className="text-lg md:text-xl font-semibold text-slate-800">
                Compilation Phases
              </h2>
            </div>
            <PhaseVisualization phases={phases} />
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CompilerVisualizer />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
