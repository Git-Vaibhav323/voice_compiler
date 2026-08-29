import { FiCode, FiInfo } from "react-icons/fi";

const TACDisplay = ({ code }) => {
  if (!code || code.length === 0) {
    return <div className="text-gray-500">No code to display</div>;
  }

  const formattedCode = code.map((line) => {
    if (
      line.startsWith("LOAD") ||
      line.startsWith("STORE") ||
      line.startsWith("ADD") ||
      line.startsWith("MUL")
    ) {
      if (line.startsWith("LOAD")) {
        const parts = line.split(" ");
        return `t${parts[1]} = ${parts[1]}`;
      }
      if (line.startsWith("STORE")) {
        const parts = line.split(" ");
        return `${parts[1]} = result`;
      }
      if (line.startsWith("ADD") || line.startsWith("MUL")) {
        const parts = line.split(" ");
        const op = line.startsWith("ADD") ? "+" : "*";
        return `t${parts[1]} = ${parts[1]} ${op} ${parts[2] || "value"}`;
      }
      return line;
    }
    return line;
  });

  return (
    <div>
      <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-mono">
        <div className="text-xs text-gray-500 mb-2 flex items-center">
          <FiCode className="mr-1" />
          Three-Address Code:
        </div>
        <div className="space-y-1">
          {formattedCode.map((line, index) => (
            <div key={index} className="flex">
              <span className="text-gray-400  w-7 flex-shrink-0 text-right mr-3">
                {index + 1}
              </span>
              <code className="text-blue-800">{line}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start space-x-2 bg-blue-50 p-3 rounded border border-blue-100 text-sm">
        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-blue-700">
            <span className="font-medium">Three-Address Code (TAC)</span> is an
            intermediate representation where:
          </p>
          <ul className="list-disc list-inside mt-2 text-blue-600 space-y-1 text-xs">
            <li>Each instruction has at most three operands</li>
            <li>
              Temporary variables (t1, t2, etc.) store intermediate results
            </li>
            <li>Complex expressions are broken down into simpler steps</li>
            <li>This representation is used for further optimization</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TACDisplay;
