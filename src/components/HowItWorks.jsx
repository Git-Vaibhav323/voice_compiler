import { Link } from "react-router";
import {
  FiHome,
  FiArrowLeft,
  FiCode,
  FiCpu,
  FiLayers,
  FiCheckSquare,
  FiZap,
  FiCpu as FiCpu2,
  FiBookOpen,
  FiMic,
  FiVolume2,
  FiServer,
} from "react-icons/fi";

const HowItWorks = () => {
  const phases = [
    {
      icon: <FiCode className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
      title: "Lexical Analysis",
      description:
        "Breaking source code into tokens (keywords, identifiers, operators, etc.)",
      details:
        "The scanner reads character streams and groups them into meaningful tokens.",
    },
    {
      icon: <FiLayers className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />,
      title: "Syntax Analysis",
      description:
        "Parsing tokens into a hierarchical structure (Abstract Syntax Tree)",
      details:
        "The parser checks if tokens follow the grammar rules of the language.",
    },
    {
      icon: <FiCheckSquare className="w-5 h-5 md:w-6 md:h-6 text-green-600" />,
      title: "Semantic Analysis",
      description: "Validating meaning and context of the parsed code",
      details:
        "Type checking, scope resolution, and ensuring operations are valid.",
    },
    {
      icon: <FiCpu className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />,
      title: "Intermediate Code",
      description: "Generating machine-independent intermediate representation",
      details:
        "Typically Three-Address Code (TAC) that's easier to optimize and translate.",
    },
    {
      icon: <FiZap className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />,
      title: "Code Optimization",
      description: "Improving intermediate code for better performance",
      details:
        "Removing redundant code, constant propagation, and other optimizations.",
    },
    {
      icon: <FiCpu2 className="w-5 h-5 md:w-6 md:h-6 text-red-600" />,
      title: "Code Generation",
      description:
        "Producing target machine code from optimized intermediate code",
      details:
        "Translating into assembly or machine code for specific architectures.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <nav className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4 md:gap-0">
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
                How It Works
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200 hover:bg-gray-100 hover:cursor-pointer transition-colors w-full md:w-auto justify-center"
          >
            <FiArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
            <span className="ml-2 text-slate-700">Back to Visualizer</span>
          </Link>
        </nav>

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl md:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
            How Compiler Phases Work
          </h2>
          <p className="text-sm md:text-lg text-slate-600 max-w-2xl mx-auto">
            Understand each step of the compilation process from source code to
            executable
          </p>
        </div>

        {/* Phases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {phases.map((phase, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-3 md:mb-4">
                <div className="bg-slate-100 p-2 md:p-3 rounded-xl mr-3 md:mr-4">
                  {phase.icon}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Phase {index + 1}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800">
                    {phase.title}
                  </h3>
                </div>
              </div>
              <p className="text-slate-600 text-sm md:text-base mb-2 md:mb-3">
                {phase.description}
              </p>
              <p className="text-xs md:text-sm text-slate-500">
                {phase.details}
              </p>
            </div>
          ))}
        </div>

        {/* Voice Workflow */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 mb-6 md:mb-8">
          <div className="flex items-center mb-4">
            <FiMic className="w-5 h-5 md:w-6 md:h-6 text-rose-600 mr-2 md:mr-3" />
            <h3 className="text-lg md:text-xl font-semibold text-slate-800">
              Using Your Voice
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {[
              {
                step: "1",
                title: "Speak your request",
                body: 'Press Speak and say something like "write a bubble sort in C". Your browser transcribes it with the Web Speech API. You can edit the text afterwards, or skip the mic and type it.',
              },
              {
                step: "2",
                title: "The AI writes the code",
                body: "The request goes to the backend, which asks a language model for a short, self-contained C program. The generated code drops into the editor and is analysed straight away.",
              },
              {
                step: "3",
                title: "Listen to each phase",
                body: "Click any phase card, or its Listen button, and the app reads that phase aloud using speech synthesis. The narration describes your actual program, not a generic script.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200"
              >
                <div className="flex items-center mb-2">
                  <span className="bg-rose-100 text-rose-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold mr-2">
                    {item.step}
                  </span>
                  <h4 className="font-semibold text-slate-800 text-sm md:text-base">
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs md:text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-xs md:text-sm text-slate-600">
            <div className="flex items-start bg-amber-50 border border-amber-200 rounded-lg p-3">
              <FiMic className="w-4 h-4 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-amber-900">
                  Browser support:
                </span>{" "}
                speech recognition needs Chrome, Edge or Safari. Firefox does
                not implement it, so the mic button is disabled there and you
                type your request instead.
              </p>
            </div>

            <div className="flex items-start bg-blue-50 border border-blue-200 rounded-lg p-3">
              <FiVolume2 className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-blue-900">
                  Reading aloud
                </span>{" "}
                works in every current browser. Use the speed slider above the
                phases to change how fast the narration is spoken.
              </p>
            </div>

            <div className="flex items-start bg-slate-50 border border-slate-200 rounded-lg p-3">
              <FiServer className="w-4 h-4 text-slate-600 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-slate-900">
                  Offline fallback:
                </span>{" "}
                if the backend is not running or has no API key, a built-in
                parser still analyses your code and the narration is generated
                from that analysis. You lose the AI code generation, not the
                phases.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 mb-6 md:mb-8">
          <div className="flex items-center mb-3 md:mb-4">
            <FiBookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mr-2 md:mr-3" />
            <h3 className="text-lg md:text-xl font-semibold text-slate-800">
              About This Tool
            </h3>
          </div>
          <div className="text-slate-600 text-sm md:text-base">
            <p className="mb-3 md:mb-4">
              This Voice Compiler Visualizer helps students and developers
              understand how source code is transformed through the various
              stages of compilation. You describe a program out loud, an AI
              writes the C code, and the app walks you through every phase both
              visually and audibly.
            </p>
            <p>
              The analysis covers tokenization, parsing into an abstract syntax
              tree, semantic checking with a scope-aware symbol table,
              three-address code with explicit control flow, optimization passes
              such as constant folding and common subexpression elimination, and
              finally target code for a simple register machine.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 md:py-3 px-4 md:px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm md:text-base cursor-pointer"
          >
            <FiHome className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            Try the Visualizer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
