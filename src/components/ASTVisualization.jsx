import { useState, useRef, useEffect } from "react";
import {
  FiAlertTriangle,
  FiCopy,
  FiMaximize,
  FiMinimize,
  FiZoomIn,
  FiZoomOut,
  FiCode,
  FiBookOpen,
  FiLoader,
} from "react-icons/fi";
import Tree from "react-d3-tree";

const ASTVisualization = ({ astString, astTree }) => {
  const [treeData, setTreeData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("visual");
  const [showLabels, setShowLabels] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(null);
  const treeContainerRef = useRef(null);

  // Resize observer
  useEffect(() => {
    if (!treeContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: isExpanded ? 500 : 300 });
    });
    resizeObserver.observe(treeContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [isExpanded]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      if (astTree && typeof astTree === "object" && astTree.name) {
        console.log("Using provided astTree");
        const fixedTree = fixTreeData(astTree);
        setTreeData(fixedTree);
        setIsLoading(false);
      } else if (astString && !astTree) {
        const timeout = setTimeout(() => {
          try {
            if (!astTree || !astTree.name) {
              console.log("Using fallback parser");
              const defaultTree = createDefaultTree(astString);
              setTreeData(defaultTree);
            }
          } catch (err) {
            console.error("Fallback parser error:", err);
            setError(`Could not parse expression: ${err.message}`);
          } finally {
            setIsLoading(false);
          }
        }, 1000);

        return () => clearTimeout(timeout);
      } else if (
        astTree === null ||
        (typeof astTree === "object" && !astTree.name)
      ) {
        // Keep waiting
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("AST processing error:", err);
      setError(`Error processing AST: ${err.message}`);
      setIsLoading(false);
    }
  }, [astTree, astString]);

  const fixTreeData = (tree) => {
    if (!tree) return null;

    // Keywords that indicate a node type/label rather than a value
    const labelKeywords = [
      "IDENTIFIER",
      "OPERATOR",
      "LITERAL",
      "ASSIGNMENT",
      "SUBTRACTION",
      "ADDITION",
      "MULTIPLICATION",
      "DIVISION",
      "NUMBER",
      "VARIABLE",
      "EXPRESSION",
    ];

    const isLabel = (str) => {
      if (!str || typeof str !== "string") return false;
      const upperStr = str.toUpperCase();
      return (
        labelKeywords.some((keyword) => upperStr.includes(keyword)) ||
        (str === str.toUpperCase() && str.length > 1 && /[A-Z_]/.test(str))
      );
    };

    const fixNode = (node) => {
      if (!node) return node;

      const newNode = { ...node };

      // Fix swapped name and label
      if (node.attributes?.label) {
        // If name looks like a type/label and label looks like a value
        if (isLabel(node.name) && !isLabel(node.attributes.label)) {
          const temp = newNode.name;
          newNode.name = node.attributes.label;
          newNode.attributes = {
            ...node.attributes,
            label: temp,
          };
        }
        // Also check if both are swapped in attributes
        else if (node.attributes.value && isLabel(node.attributes.value)) {
          // Swap value and label in attributes
          newNode.attributes = {
            ...node.attributes,
            label: node.attributes.value,
            value: node.attributes.label,
          };
        }
      }

      // Special handling for operator nodes
      if (node.name && "+-*/=:=".includes(node.name)) {
        newNode.attributes = {
          ...newNode.attributes,
          type: "operator",
          label: getOperatorLabel(node.name),
        };
      }

      // Recursively fix children
      if (node.children && Array.isArray(node.children)) {
        newNode.children = node.children.map((child) => fixNode(child));
      }

      return newNode;
    };

    const getOperatorLabel = (op) => {
      const operatorLabels = {
        "+": "ADDITION",
        "-": "SUBTRACTION",
        "*": "MULTIPLICATION",
        "/": "DIVISION",
        "=": "ASSIGNMENT",
        ":=": "ASSIGNMENT",
      };
      return operatorLabels[op] || "OPERATOR";
    };

    return fixNode(tree);
  };

  const createDefaultTree = (code) => {
    if (!code || typeof code !== "string") {
      throw new Error("Invalid or missing code");
    }

    // Extract the actual code if wrapped
    let extractedCode = code;
    if (code.includes("Expression:")) {
      const match = code.match(/Expression:\s*(.+?)(?:\n|$)/);
      if (match) {
        extractedCode = match[1].trim();
      }
    }

    if (!extractedCode) {
      throw new Error("Empty expression");
    }

    const isAssignment =
      extractedCode.includes(":=") ||
      (extractedCode.includes("=") &&
        !extractedCode.includes("==") &&
        !extractedCode.includes("!="));

    if (isAssignment) {
      const assignOp = extractedCode.includes(":=") ? ":=" : "=";
      const parts = extractedCode.split(assignOp);

      if (parts.length < 2) {
        throw new Error(`Invalid assignment: ${extractedCode}`);
      }

      const leftSide = parts[0].trim();
      const rightSide = parts[1]?.trim() || "";

      if (!leftSide) {
        throw new Error("Missing left side of assignment");
      }

      // Enhanced parsing for right side expressions
      const parseExpression = (expr) => {
        if (!expr) {
          return {
            name: "empty",
            attributes: {
              type: "literal",
              label: "EMPTY",
            },
          };
        }

        // Check for operators (order matters: check longer operators first)
        const operators = ["-", "+", "*", "/", "%"];

        for (const op of operators) {
          // Skip if it's a negative number at the start
          if (op === "-" && expr.startsWith("-")) {
            continue;
          }

          // Find the operator
          const opIndex = op === "-" ? expr.lastIndexOf(op) : expr.indexOf(op);
          if (opIndex > 0) {
            const leftPart = expr.substring(0, opIndex).trim();
            const rightPart = expr.substring(opIndex + 1).trim();

            if (!leftPart || !rightPart) {
              throw new Error(`Invalid expression around operator '${op}'`);
            }

            return {
              name: op,
              attributes: {
                type: "operator",
                label: getOperatorName(op),
              },
              children: [parseExpression(leftPart), parseExpression(rightPart)],
            };
          }
        }

        // It's a simple identifier or literal
        const isNumber = /^-?\d+(\.\d+)?$/.test(expr);
        return {
          name: expr,
          attributes: {
            type: isNumber ? "literal" : "identifier",
            label: isNumber ? "NUMBER" : "IDENTIFIER",
          },
        };
      };

      const getOperatorName = (op) => {
        const names = {
          "+": "ADDITION",
          "-": "SUBTRACTION",
          "*": "MULTIPLICATION",
          "/": "DIVISION",
          "%": "MODULO",
        };
        return names[op] || "OPERATOR";
      };

      return {
        name: assignOp,
        attributes: { type: "operator", label: "ASSIGNMENT" },
        children: [
          {
            name: leftSide,
            attributes: { type: "identifier", label: "IDENTIFIER" },
          },
          parseExpression(rightSide),
        ],
      };
    }

    // Non-assignment expressions
    return {
      name: extractedCode,
      attributes: { type: "default", label: "EXPRESSION" },
      children: [],
    };
  };

  const copyToClipboard = () => {
    if (astString) {
      navigator.clipboard.writeText(astString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));

  const renderCustomNode = ({ nodeDatum }) => {
    const nodeType = nodeDatum.attributes?.type || "default";
    const nodeLabel = nodeDatum.attributes?.label || "";

    const colorMap = {
      operator: ["#2563eb", "#dbeafe", "#1e40af"],
      literal: ["#16a34a", "#dcfce7", "#15803d"],
      identifier: ["#9333ea", "#f3e8ff", "#7c3aed"],
      function: ["#ca8a04", "#fef9c3", "#a16207"],
      default: ["#475569", "#f8fafc", "#334155"],
    };

    const [primaryColor, lightColor, darkColor] =
      colorMap[nodeType] || colorMap.default;

    return (
      <g>
        {/* Main node rectangle */}
        <rect
          x="-70"
          y="-25"
          width="140"
          height="50"
          rx="8"
          fill={lightColor}
          stroke={primaryColor}
          strokeWidth="2"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
            transition: "all 0.3s ease",
          }}
        />

        {/* Node value/name */}
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fill={darkColor}
          style={{
            fontSize: "20px",
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            fontWeight: "400",
            dominantBaseline: "middle",
          }}
        >
          {nodeDatum.name}
        </text>

        {/* Label badge */}
        {showLabels && nodeLabel && (
          <g>
            <rect
              x={-nodeLabel.length * 4 - 10}
              y="-50"
              width={nodeLabel.length * 8 + 20}
              height="22"
              rx="11"
              fill={primaryColor}
              style={{
                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
              }}
            />
            <text
              x="0"
              y="-39"
              textAnchor="middle"
              fill="white"
              style={{
                fontSize: "12px",
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                fontWeight: "300",
                dominantBaseline: "middle",
                letterSpacing: "0.06em",
              }}
            >
              {nodeLabel}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderTextAST = () => {
    // Extract code from astString
    let code = "";
    if (astString) {
      if (astString.includes("Expression:")) {
        const match = astString.match(/Expression:\s*(.+?)(?:\n|$)/);
        if (match) {
          code = match[1].trim();
        }
      } else {
        code = astString.trim();
      }
    }

    if (!code) {
      code = error ? "Invalid expression" : "a = a - 10";
    }

    const assignOperator = code.includes(":=")
      ? ":="
      : code.includes("=")
      ? "="
      : "";
    const parts = assignOperator ? code.split(assignOperator) : [];
    const leftSide = parts[0]?.trim() || "";
    const rightSide = parts[1]?.trim() || "";

    return (
      <div className="h-full overflow-auto p-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Abstract Syntax Tree Analysis
            </h3>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 mb-1">
                Expression:
              </h4>
              <p className="bg-blue-50 p-3 rounded border border-blue-200 font-mono text-sm">
                {code}
              </p>
            </div>

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiAlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error parsing expression
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Tree Structure:
                  </h4>

                  {assignOperator ? (
                    <div className="pl-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-bold">
                          {assignOperator}
                        </span>
                        <span className="text-gray-600">(Assignment)</span>
                      </div>

                      <div className="pl-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">├─</span>
                          <span className="text-purple-600 font-semibold">
                            {leftSide}
                          </span>
                          <span className="text-gray-500 text-sm">
                            (Variable)
                          </span>
                        </div>

                        {renderExpressionTree(rightSide)}
                      </div>
                    </div>
                  ) : (
                    <div className="pl-4 text-gray-600">
                      Simple expression (no assignment operator)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExpressionTree = (expr, isRoot = false) => {
    if (!expr) return null;

    // Check for operators
    const operators = ["-", "+", "*", "/", "%"];

    for (const op of operators) {
      const opIndex = op === "-" ? expr.lastIndexOf("-") : expr.indexOf(op);
      if (opIndex > 0) {
        const leftPart = expr.substring(0, opIndex).trim();
        const rightPart = expr.substring(opIndex + 1).trim();

        const opNames = {
          "+": "Addition",
          "-": "Subtraction",
          "*": "Multiplication",
          "/": "Division",
          "%": "Modulo",
        };

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">└─</span>
              <span className="text-red-600 font-bold">{op}</span>
              <span className="text-gray-600">({opNames[op]})</span>
            </div>
            <div className="pl-8 space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">├─</span>
                <span className="text-purple-600 font-semibold">
                  {leftPart}
                </span>
                <span className="text-gray-500 text-sm">
                  {/^\d+$/.test(leftPart) ? "(Number)" : "(Variable)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">└─</span>
                <span className="text-purple-600 font-semibold">
                  {rightPart}
                </span>
                <span className="text-gray-500 text-sm">
                  {/^\d+$/.test(rightPart) ? "(Number)" : "(Variable)"}
                </span>
              </div>
            </div>
          </div>
        );
      }
    }

    // Simple expression
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{isRoot ? "" : "└─"}</span>
        <span className="text-purple-600 font-semibold">{expr}</span>
        <span className="text-gray-500 text-sm">
          {/^\d+$/.test(expr) ? "(Number)" : "(Variable)"}
        </span>
      </div>
    );
  };

  const renderErrorView = () => (
    <div className="h-full flex flex-col items-center justify-center text-slate-700 p-6">
      <FiAlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-medium mb-2">Expression Parsing Error</h3>
      <p className="text-center text-slate-600 mb-4 max-w-md">
        {error || "Could not parse the expression properly."}
      </p>
      <div className="bg-slate-100 p-3 rounded-md text-sm font-mono w-full max-w-md overflow-auto">
        {astString || "No expression provided"}
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Try checking for syntax errors in your expression.
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <FiLoader className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm font-medium">Generating AST...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-4 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("text")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === "text"
                ? "bg-blue-100 text-blue-800 border border-blue-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FiCode className="inline mr-1" /> Text View
          </button>
          <button
            onClick={() => setViewMode("visual")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === "visual"
                ? "bg-blue-100 text-blue-800 border border-blue-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FiBookOpen className="inline mr-1" /> Visual Tree
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              showLabels
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {showLabels ? "Hide Labels" : "Show Labels"}
          </button>
        </div>
        <div className="flex gap-2">
          {viewMode === "visual" && (
            <>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
              >
                <FiZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
              >
                <FiZoomOut className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
          >
            <FiCopy className="w-3 h-3 inline mr-1" /> Copy
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
          >
            {isExpanded ? (
              <FiMinimize className="w-3 h-3 inline mr-1" />
            ) : (
              <FiMaximize className="w-3 h-3 inline mr-1" />
            )}
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <div
        ref={treeContainerRef}
        className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${
          isExpanded ? "h-[500px]" : "h-[300px]"
        }`}
      >
        {error && viewMode === "visual" ? (
          renderErrorView()
        ) : viewMode === "text" ? (
          renderTextAST()
        ) : treeData ? (
          <Tree
            data={treeData}
            orientation="vertical"
            renderCustomNodeElement={renderCustomNode}
            translate={{ x: dimensions.width / 2, y: 80 }}
            zoom={zoom}
            pathFunc="step"
            separation={{ siblings: 2, nonSiblings: 2.5 }}
            zoomable
            draggable
            collapsible={false}
            nodeSize={{ x: 160, y: 100 }}
          />
        ) : (
          <div className="text-center text-slate-500 py-8">
            <FiAlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>No AST data available</p>
          </div>
        )}
      </div>

      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg animate-fadeInOut text-sm z-50">
          ✓ AST copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default ASTVisualization;
