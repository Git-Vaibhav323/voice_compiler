import { FiVolume2, FiSquare } from "react-icons/fi";

/**
 * The per-phase "read this aloud" control.
 *
 * Rendered inside each phase header. Pressing it while it is already speaking
 * stops the narration, so it doubles as a stop button.
 */
const SpeakButton = ({ active, speaking, supported, onClick, label }) => {
  if (!supported) return null;

  const isActive = active && speaking;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={isActive ? "Stop reading" : `Read ${label} aloud`}
      aria-label={isActive ? "Stop reading" : `Read ${label} aloud`}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer flex-shrink-0
        ${
          isActive
            ? "bg-rose-500 border-rose-500 text-white shadow-sm"
            : "bg-white border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
        }`}
    >
      {isActive ? (
        <>
          <FiSquare className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">Stop</span>
        </>
      ) : (
        <>
          <FiVolume2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Listen</span>
        </>
      )}
    </button>
  );
};

export default SpeakButton;
