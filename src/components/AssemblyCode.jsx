import { FiCpu, FiInfo, FiArrowRight } from "react-icons/fi";

const AssemblyCode = ({ optimizedCode, assemblyCode }) => {
  const hasValidAssemblyCode =
    assemblyCode && Array.isArray(assemblyCode) && assemblyCode.length > 0;

  if (!hasValidAssemblyCode) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg text-center">
        <div className="text-gray-400 mb-3">No assembly code available</div>
        <div className="text-xs text-gray-500">
          This could be due to an unsupported expression or a processing error.
          Try a different expression like "total := price + rate * 60".
        </div>
      </div>
    );
  }

  const getInstructionExplanation = (instruction) => {
    if (instruction.startsWith("LOAD")) {
      return "Loads a value from memory into a register";
    } else if (instruction.startsWith("STORE")) {
      return "Stores a value from a register to memory";
    } else if (instruction.startsWith("ADD")) {
      return "Adds the value to the register";
    } else if (instruction.startsWith("SUB")) {
      return "Subtracts the value from the register";
    } else if (instruction.startsWith("MUL")) {
      return "Multiplies the register by the value";
    } else if (instruction.startsWith("DIV")) {
      return "Divides the register by the value";
    } else {
      return "Performs the specified operation";
    }
  };

  const mapTacToAssembly = () => {
    if (!optimizedCode || optimizedCode.length === 0) return [];

    const mapping = [];
    let assemblyIndex = 0;

    for (let i = 0; i < optimizedCode.length; i++) {
      const tac = optimizedCode[i];
      const assemblyStart = assemblyIndex;

      if (tac.includes("*")) {
        assemblyIndex += 3; // LOAD + MUL + STORE
      } else if (tac.includes("+")) {
        assemblyIndex += 3; // LOAD + ADD + STORE
      } else if (tac.includes("-")) {
        assemblyIndex += 3; // LOAD + SUB + STORE
      } else {
        assemblyIndex += 2; // LOAD + STORE
      }

      const assemblyEnd = Math.min(assemblyIndex, assemblyCode.length);

      mapping.push({
        tac,
        assembly: assemblyCode.slice(assemblyStart, assemblyEnd),
      });
    }

    return mapping;
  };

  const tacToAssemblyMap = mapTacToAssembly();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center text-sm text-gray-500">
          <FiCpu className="mr-1 text-green-500" />
          Target Assembly Code:
        </div>
        <div className="hidden md:flex px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
          Generic Assembly
        </div>
      </div>

      {/* Desktop view (grid-based table) */}
      <div className="hidden md:block bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
        <div className="grid grid-cols-12 text-xs text-gray-400 bg-gray-800 p-2">
          <div className="col-span-1">Line</div>
          <div className="col-span-3">Instruction</div>
          <div className="col-span-2">Opcode</div>
          <div className="col-span-6">Description</div>
        </div>

        <div className="p-2 space-y-1">
          {assemblyCode.map((line, index) => {
            const parts = line.split(" ");
            const opcode = parts[0];
            // const operands = parts.slice(1).join(" ");

            return (
              <div
                key={index}
                className="grid grid-cols-12 items-center hover:bg-gray-800 rounded p-1"
              >
                <div className="col-span-1 text-gray-500 text-xs">
                  {index + 1}
                </div>
                <code className="col-span-3 text-green-400 font-mono">
                  {line}
                </code>
                <div className="col-span-2">
                  <span className="px-1.5 py-0.5 bg-green-900 text-green-300 rounded text-xs font-medium">
                    {opcode}
                  </span>
                </div>
                <div className="col-span-6 text-gray-400 text-xs">
                  {getInstructionExplanation(line)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile view (simplified list) */}
      <div className="md:hidden bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
        <div className="p-2 space-y-3">
          {assemblyCode.map((line, index) => {
            const parts = line.split(" ");
            const opcode = parts[0];
            // const operands = parts.slice(1).join(" ");

            return (
              <div
                key={index}
                className="hover:bg-gray-800 rounded p-2 border-b border-gray-800 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 text-xs">
                    Line {index + 1}
                  </span>
                  <span className="px-1.5 py-0.5 bg-green-900 text-green-300 rounded text-xs font-medium">
                    {opcode}
                  </span>
                </div>
                <code className="block mb-1.5 text-green-400 font-mono text-sm">
                  {line}
                </code>
                <div className="text-gray-400 text-xs">
                  {getInstructionExplanation(line)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tacToAssemblyMap.length > 0 && (
        <div className="mt-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
          <h3 className="text-sm text-green-300 font-medium mb-2 flex items-center">
            <FiArrowRight className="mr-1" /> Three-Address Code to Assembly
            Mapping:
          </h3>
          <div className="space-y-3">
            {tacToAssemblyMap.map((mapping, index) => (
              <div key={index} className="border-t border-gray-700 pt-2">
                <div className="text-amber-400 text-xs mb-1 font-mono">
                  {mapping.tac}
                </div>
                <div className="pl-4 border-l-2 border-gray-600">
                  {mapping.assembly.map((asm, asmIndex) => (
                    <div
                      key={asmIndex}
                      className="text-green-400 text-xs font-mono mb-1"
                    >
                      {asm}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start space-x-2 bg-gray-800 p-3 rounded border border-gray-700 text-sm">
        <FiInfo className="text-green-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-green-300">
            <span className="font-medium">Assembly Code</span> is the low-level
            language that runs directly on the processor.
          </p>
          <ul className="list-disc list-inside mt-2 text-gray-400 space-y-1 text-xs">
            <li>
              Each instruction typically corresponds to a single processor
              operation
            </li>
            <li>
              Registers (R1, R2, etc.) are used for temporary storage during
              computation
            </li>
            <li>
              LOAD/STORE operations move data between memory and registers
            </li>
            <li>
              ADD/SUB/MUL/DIV perform arithmetic operations on register values
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssemblyCode;
