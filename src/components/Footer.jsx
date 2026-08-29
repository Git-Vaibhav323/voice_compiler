import { FiGithub, FiCode, FiHeart } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="py-5 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <div className="flex items-center text-sm text-gray-600">
            <span>Built with</span>
            <FiCode className="mx-1 text-blue-500" />
            <span>&</span>
            <FiHeart className="mx-1 text-red-500" />
            <span>by</span>
            <a
              href="https://github.com/danielace1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 transition-colors mx-1 hover:underline"
            >
              Sudharsan
              <FiGithub size={14} />
            </a>
          </div>

          <span className="text-gray-400 mx-1">•</span>

          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Compiler Visualizer
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
