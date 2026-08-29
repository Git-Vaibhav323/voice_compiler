import TokenTable from "./TokenTable";
import ASTVisualization from "./ASTVisualization";
import TACDisplay from "./TACDisplay";
import CodeOptimizer from "./CodeOptimizer";
import AssemblyCode from "./AssemblyCode";
import SpeakButton from "./SpeakButton";
import { getPhaseNarration } from "../services/narration";
import { useSpeech } from "../hooks/useSpeech";
import {
  FiCheckCircle,
  FiDatabase,
  FiInfo,
  FiCode,
  FiZap,
  FiCpu,
  FiVolumeX,
} from "react-icons/fi";

/**
 * Tailwind cannot see interpolated class names such as `bg-${color}-100`, so
 * the colour variants are written out in full here.
 */
const COLOR_STYLES = {
  gray: { badge: "bg-gray-100 text-gray-800", icon: "text-gray-500", ring: "ring-gray-300" },
  blue: { badge: "bg-blue-100 text-blue-800", icon: "text-blue-500", ring: "ring-blue-300" },
  indigo: { badge: "bg-indigo-100 text-indigo-800", icon: "text-indigo-500", ring: "ring-indigo-300" },
  purple: { badge: "bg-purple-100 text-purple-800", icon: "text-purple-500", ring: "ring-purple-300" },
  amber: { badge: "bg-amber-100 text-amber-800", icon: "text-amber-500", ring: "ring-amber-300" },
  green: { badge: "bg-green-100 text-green-800", icon: "text-green-500", ring: "ring-green-300" },
};

export default function PhaseVisualization({ phases }) {
  const { speak, stop, speaking, activeId, supported, rate, setRate } = useSpeech();

  if (!phases) {
    return (
      <div className="mt-6 p-4 md:p-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center justify-center">
        <FiInfo className="mr-2 flex-shrink-0" />
        <p>Enter code and click "Analyze" to see the compiler phases.</p>
      </div>
    );
  }

  // Derive assembly from the optimised TAC if the analysis did not supply any.
  if (
    !phases.assemblyCode ||
    !Array.isArray(phases.assemblyCode) ||
    phases.assemblyCode.length === 0
  ) {
    const assemblyCode = [];

    if (phases.optimizedCode?.length) {
      phases.optimizedCode.forEach((line) => {
        if (!line.includes("=")) return;

        const [leftSide, rightSide] = line.split("=").map((p) => p.trim());
        const binary = ["+", "-", "*", "/"].find((op) => rightSide.includes(op));

        if (binary) {
          const mnemonic = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV" }[binary];
          const [a, b] = rightSide.split(binary).map((p) => p.trim());
          assemblyCode.push(`LOAD R1, ${a}`);
          assemblyCode.push(`${mnemonic} R1, ${b}`);
          assemblyCode.push(`STORE ${leftSide}, R1`);
        } else {
          assemblyCode.push(`LOAD R1, ${rightSide}`);
          assemblyCode.push(`STORE ${leftSide}, R1`);
        }
      });

      phases.assemblyCode = assemblyCode;
    }
  }

  const handleSpeak = (phaseKey) => {
    speak(getPhaseNarration(phaseKey, phases), phaseKey);
  };

  /**
   * One phase card. The whole card is clickable, which is what makes
   * "click a phase and it reads aloud" work. Clicks landing on interactive
   * children (the AST canvas, buttons, links) are ignored so those keep
   * behaving normally.
   */
  const PhaseCard = ({ phaseKey, number, title, icon: Icon, color, children }) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.gray;
    const isActive = activeId === phaseKey && speaking;

    const handleCardClick = (event) => {
      const interactive = event.target.closest(
        "button, a, input, textarea, select, svg, canvas, [role='button']"
      );
      if (interactive) return;
      handleSpeak(phaseKey);
    };

    return (
      <section
        onClick={handleCardClick}
        className={`bg-white p-4 md:p-6 rounded-lg shadow-sm border transition-all cursor-pointer
          ${
            isActive
              ? `border-transparent ring-2 ${styles.ring} shadow-md`
              : "border-gray-100 hover:border-gray-300 hover:shadow"
          }`}
      >
        <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <span
            className={`${styles.badge} w-7 h-7 rounded-full inline-flex items-center justify-center text-sm font-bold flex-shrink-0`}
          >
            {number}
          </span>
          <span className="mr-auto">{title}</span>

          <SpeakButton
            active={activeId === phaseKey}
            speaking={speaking}
            supported={supported}
            onClick={() => handleSpeak(phaseKey)}
            label={title}
          />

          {Icon && <Icon className={`${styles.icon} flex-shrink-0 hidden sm:block`} />}
        </h2>

        {children}
      </section>
    );
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Narration controls */}
      {supported ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs md:text-sm text-slate-600 mr-auto">
            Click any phase below, or press its Listen button, to hear it
            explained.
          </p>

          <div className="flex items-center gap-2">
            <label htmlFor="speech-rate" className="text-xs text-slate-500">
              Speed
            </label>
            <input
              id="speech-rate"
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-24 cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-slate-500 w-8">{rate.toFixed(1)}x</span>
          </div>

          {speaking && (
            <button
              onClick={stop}
              className="text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Stop narration
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <FiVolumeX className="w-4 h-4 mr-2 flex-shrink-0" />
          <p className="text-xs md:text-sm">
            This browser does not support speech synthesis, so phases cannot be
            read aloud.
          </p>
        </div>
      )}

      <PhaseCard
        phaseKey="lexical"
        number="1"
        title="Lexical Analysis"
        icon={FiCode}
        color="gray"
      >
        <TokenTable tokens={phases.tokens} />
      </PhaseCard>

      <PhaseCard
        phaseKey="syntax"
        number="2"
        title="Syntax Analysis"
        icon={FiCode}
        color="blue"
      >
        <ASTVisualization astTree={phases.treeData} astString={phases.ast} />
      </PhaseCard>

      <PhaseCard
        phaseKey="semantic"
        number="3"
        title="Semantic Analysis"
        icon={FiDatabase}
        color="indigo"
      >
        <div className="mb-5">
          <h3 className="font-medium mb-2 text-gray-700 flex items-center">
            <FiCheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Type Checking:
          </h3>
          <div className="md:ml-7 bg-green-50 p-3 rounded-md border border-green-200">
            <p className="text-sm text-green-800">
              {phases.semanticAnalysis?.typeChecking === "success" ? (
                <span className="font-medium">
                  All expressions are well-typed. No type errors detected.
                </span>
              ) : (
                phases.semanticAnalysis?.typeChecking ||
                "No type checking information available"
              )}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2 text-gray-700 flex items-center">
            <FiDatabase className="h-5 w-5 mr-2 text-blue-500" />
            Symbol Table:
          </h3>

          <div className="md:ml-7 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-blue-50">
                <tr>
                  {["Name", "Type", "Scope"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {phases.semanticAnalysis?.symbolTable?.map((symbol, index) => (
                  <tr
                    key={`${symbol.name}-${symbol.scope}-${index}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {symbol.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {symbol.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {symbol.scope}
                    </td>
                  </tr>
                ))}
                {!phases.semanticAnalysis?.symbolTable?.length && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-3 text-sm text-gray-500 text-center"
                    >
                      No symbol table information available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 md:ml-7 bg-gray-50 p-3 rounded border border-gray-200 flex">
            <FiInfo className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              <span className="font-medium">Note:</span> The symbol table stores
              each identifier along with its type and the scope it belongs to.
              Function parameters and local variables are recorded against their
              enclosing function.
            </p>
          </div>
        </div>
      </PhaseCard>

      <PhaseCard
        phaseKey="intermediate"
        number="4"
        title="Intermediate Code Generation"
        icon={FiCode}
        color="purple"
      >
        <TACDisplay code={phases.intermediateCode} />
      </PhaseCard>

      <PhaseCard
        phaseKey="optimization"
        number="5"
        title="Code Optimization"
        icon={FiZap}
        color="amber"
      >
        <CodeOptimizer
          intermediateCode={phases.intermediateCode}
          optimizedCode={phases.optimizedCode}
        />
      </PhaseCard>

      <PhaseCard
        phaseKey="codegen"
        number="6"
        title="Code Generation"
        icon={FiCpu}
        color="green"
      >
        <AssemblyCode
          optimizedCode={phases.optimizedCode}
          assemblyCode={phases.assemblyCode}
        />
      </PhaseCard>
    </div>
  );
}
