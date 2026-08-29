import { FiCode, FiHeart } from "react-icons/fi";

const Footer = () => (
  <footer
    className="py-6 text-center"
    style={{ borderTop: "1px solid var(--border)" }}
  >
    <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
      <span>Built with</span>
      <FiCode className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />
      <span>&amp;</span>
      <FiHeart className="w-3.5 h-3.5" style={{ color: "#A855F7" }} />
      <span className="mx-2" style={{ color: "var(--border)" }}>·</span>
      <span className="font-code text-xs">&copy; {new Date().getFullYear()} Compiler Visualizer</span>
    </div>
  </footer>
);

export default Footer;
