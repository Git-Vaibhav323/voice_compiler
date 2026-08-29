import { FiCode, FiZap, FiInfo } from "react-icons/fi";

const CodeOptimizer = ({ intermediateCode, optimizedCode }) => {
  if (!optimizedCode || optimizedCode.length === 0) {
    return <div className="text-gray-500">No optimized code available</div>;
  }

  const getOptimizationType = (before, after) => {
    if (before.length > after.length) {
      return "Redundant Code Elimination";
    } else if (
      before.some((line) => line.includes("t2")) &&
      !after.some((line) => line.includes("t2"))
    ) {
      return "Temporary Variable Elimination";
    } else if (
      before.length === after.length &&
      JSON.stringify(before) !== JSON.stringify(after)
    ) {
      return "Algebraic Simplification";
    } else {
      return "No Optimization Applied";
    }
  };

  const optimizationType = getOptimizationType(
    intermediateCode || [],
    optimizedCode
  );

  const getOptimizationDetails = () => {
    if (intermediateCode && intermediateCode.length > optimizedCode.length) {
      const removedLines = intermediateCode.filter(
        (line) => !optimizedCode.includes(line)
      );
      return `Eliminated ${
        removedLines.length
      } instruction(s): ${removedLines.join(", ")}`;
    }

    if (intermediateCode && intermediateCode.length === optimizedCode.length) {
      const changes = intermediateCode
        .map((line, i) => {
          if (line !== optimizedCode[i]) {
            return `"${line}" → "${optimizedCode[i]}"`;
          }
          return null;
        })
        .filter(Boolean);

      if (changes.length > 0) {
        return `Simplified expressions: ${changes.join(", ")}`;
      }
    }

    if (
      intermediateCode &&
      intermediateCode.some((line) => line.includes("t2")) &&
      !optimizedCode.some((line) => line.includes("t2"))
    ) {
      return "Combined operations to reduce temporary variables";
    }

    return "Applied standard compiler optimizations";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center text-xs text-gray-500">
          <FiZap className="mr-1 text-amber-500" />
          Optimized Three-Address Code:
        </div>
        <div className="hidden md:flex px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
          {optimizationType}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-mono">
          <div className="text-xs text-gray-500 mb-2">Before Optimization:</div>
          <div className="space-y-1 opacity-70">
            {intermediateCode &&
              intermediateCode.map((line, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-400 w-7 flex-shrink-0 text-right mr-3">
                    {index + 1}
                  </span>
                  <code className="text-blue-800">{line}</code>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 font-mono">
          <div className="text-xs text-amber-700 mb-2">After Optimization:</div>
          <div className="space-y-1">
            {optimizedCode.map((line, index) => (
              <div key={index} className="flex">
                <span className="text-amber-400 w-7 flex-shrink-0 text-right mr-3">
                  {index + 1}
                </span>
                <code className="text-amber-800 font-medium">{line}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start space-x-2 bg-amber-50 p-3 rounded border border-amber-100 text-sm">
        <FiInfo className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-amber-800">
            <span className="font-medium">Optimization Applied:</span>{" "}
            {getOptimizationDetails()}
          </p>
          <ul className="-ml-2 list-disc list-inside mt-2 text-amber-700 space-y-1 text-xs">
            <li>Reduced code size and improved execution efficiency</li>
            <li>Eliminated unnecessary temporary variables</li>
            <li>Combined multiple operations where possible</li>
            <li>
              This optimization preserves the semantic meaning of the code
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CodeOptimizer;
