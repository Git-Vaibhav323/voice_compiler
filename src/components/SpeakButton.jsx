import { FiVolume2, FiSquare } from "react-icons/fi";

/**
 * Per-phase "read aloud" toggle button.
 * Returns null when speech synthesis is unavailable.
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
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer flex-shrink-0"
      style={
        isActive
          ? {
              background: "linear-gradient(135deg,#6366F1,#A855F7)",
              border: "none",
              color: "#fff",
              boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
            }
          : {
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-secondary)",
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
          e.currentTarget.style.color = "#a5b4fc";
          e.currentTarget.style.background = "rgba(99,102,241,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "var(--border-mid)";
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }
      }}
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
