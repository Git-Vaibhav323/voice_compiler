/**
 * Narration builder.
 *
 * Turns the phase data into prose meant to be *heard*, not read. When the AI
 * analysis includes an `explanations` object we use that, since it can talk
 * about the program specifically. Otherwise we compose narration from the data
 * itself, so the offline path still speaks something meaningful rather than a
 * canned script.
 *
 * Everything here avoids symbols that sound wrong through a speech synthesiser
 * (see speakableSymbol / humanizeCode below).
 */

const SYMBOL_WORDS = {
  "+": "plus",
  "-": "minus",
  "*": "times",
  "/": "divided by",
  "%": "modulo",
  "=": "equals",
  "==": "is equal to",
  "!=": "is not equal to",
  "<": "less than",
  ">": "greater than",
  "<=": "less than or equal to",
  ">=": "greater than or equal to",
  "&&": "and",
  "||": "or",
  "!": "not",
  "++": "increment",
  "--": "decrement",
  "[]": "array index",
  "?:": "ternary",
};

function speakableSymbol(symbol) {
  return SYMBOL_WORDS[symbol] || symbol;
}

/** Rewrite a line of code into something a speech synthesiser reads sensibly. */
function humanizeCode(line) {
  return line
    .replace(/\bifFalse\b/g, "if not")
    .replace(/\bgoto\b/g, "jump to")
    .replace(/\bt(\d+)\b/g, "temp $1")
    .replace(/\bL(\d+):?/g, "label $1")
    .replace(/([A-Za-z0-9_)\]])\s*\*\s*([A-Za-z0-9_(])/g, "$1 times $2")
    .replace(/([A-Za-z0-9_)\]])\s*\/\s*([A-Za-z0-9_(])/g, "$1 divided by $2")
    .replace(/\+/g, " plus ")
    .replace(/(?<![<>!=])=(?!=)/g, " gets ")
    .replace(/==/g, " is equal to ")
    .replace(/\s+/g, " ")
    .trim();
}

const IRREGULAR_PLURALS = {
  entry: "entries",
  property: "properties",
};

function pluralize(count, noun) {
  if (count === 1) return `${count} ${noun}`;

  const plural =
    IRREGULAR_PLURALS[noun] ||
    (/(s|x|z|ch|sh)$/.test(noun)
      ? `${noun}es`
      : /[^aeiou]y$/.test(noun)
        ? `${noun.slice(0, -1)}ies`
        : `${noun}s`);

  return `${count} ${plural}`;
}

function listItems(items, limit = 4) {
  const shown = items.slice(0, limit);

  if (!shown.length) return "";
  if (shown.length === 1) return shown[0];

  const last = shown[shown.length - 1];
  const rest = shown.slice(0, -1).join(", ");
  const tail = items.length > limit ? `, and ${items.length - limit} more` : ` and ${last}`;

  return items.length > limit ? `${rest}, ${last}${tail}` : `${rest}${tail}`;
}

/* ------------------------------------------------------------------ *
 * Per-phase narration
 * ------------------------------------------------------------------ */

function narrateLexical(phases) {
  const tokens = phases.tokens || [];

  if (!tokens.length) {
    return "The lexical analyser produced no tokens for this input.";
  }

  const normalized = tokens.map((t) =>
    typeof t === "string" ? { lexeme: t, token: "TOKEN" } : t
  );

  const counts = {};
  normalized.forEach((t) => {
    const type = (t.token || "UNKNOWN").toLowerCase();
    counts[type] = (counts[type] || 0) + 1;
  });

  const breakdown = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => `${pluralize(count, type.replace(/_/g, " "))}`);

  const identifiers = [
    ...new Set(
      normalized
        .filter((t) => (t.token || "").toUpperCase() === "IDENTIFIER")
        .map((t) => t.lexeme)
    ),
  ];

  let text =
    `The lexical analyser scanned your source and produced ${pluralize(normalized.length, "token")}. ` +
    `That breaks down into ${listItems(breakdown)}.`;

  if (identifiers.length) {
    text += ` The identifiers it found include ${listItems(identifiers, 5)}.`;
  }

  text +=
    " Notice that whitespace and comments have disappeared entirely. They matter to you, not to the compiler.";

  return text;
}

function narrateSyntax(phases) {
  const tree = phases.treeData;

  if (!tree) {
    return "No syntax tree was produced for this input.";
  }

  const stats = treeStats(tree);
  const functions = (tree.children || []).filter(
    (c) => c.attributes?.type === "function"
  );

  let text =
    `The parser arranged those tokens into an abstract syntax tree with ${pluralize(stats.nodes, "node")}, ` +
    `nested ${stats.depth} level${stats.depth === 1 ? "" : "s"} deep.`;

  if (functions.length) {
    text += ` The root is the translation unit, and beneath it sit ${listItems(
      functions.map((f) => f.name.replace(/\(\)$/, ""))
    )}.`;
  } else if (tree.attributes?.type === "operator") {
    text += ` The root of the tree is the ${speakableSymbol(tree.name)} operator, which means it is applied last, after its children have been evaluated.`;
  }

  if (stats.operators.length) {
    text += ` The operators in the tree are ${listItems(
      stats.operators.map(speakableSymbol),
      5
    )}.`;
  }

  text +=
    " The shape of this tree is what encodes precedence. Nothing lower in the tree can be evaluated after something above it.";

  return text;
}

function treeStats(node, depth = 1) {
  let nodes = 1;
  let maxDepth = depth;
  const operators = [];

  if (node.attributes?.type === "operator") {
    operators.push(node.name);
  }

  (node.children || []).forEach((child) => {
    const childStats = treeStats(child, depth + 1);
    nodes += childStats.nodes;
    maxDepth = Math.max(maxDepth, childStats.depth);
    operators.push(...childStats.operators);
  });

  return { nodes, depth: maxDepth, operators: [...new Set(operators)] };
}

function narrateSemantic(phases) {
  const semantic = phases.semanticAnalysis || {};
  const symbols = semantic.symbolTable || [];

  let text = "The semantic analyser checked meaning rather than shape. ";

  if (semantic.typeChecking && semantic.typeChecking !== "success") {
    text += `${semantic.typeChecking} `;
  } else {
    text += "All expressions are well typed, and no type errors were detected. ";
  }

  if (symbols.length) {
    const scopes = [...new Set(symbols.map((s) => s.scope))];
    text +=
      `It built a symbol table with ${pluralize(symbols.length, "entry")} across ${pluralize(scopes.length, "scope")}. ` +
      `The symbols are ${listItems(
        symbols.map((s) => `${s.name}, of type ${s.type}`),
        4
      )}.`;
  } else {
    text += "No symbols were recorded in the symbol table for this input.";
  }

  text +=
    " This is the phase that catches using a variable before declaring it, or adding a number to a string.";

  return text;
}

function narrateIntermediate(phases) {
  const code = phases.intermediateCode || [];

  if (!code.length) {
    return "No intermediate code was generated for this input.";
  }

  const temps = new Set();
  const labels = new Set();

  code.forEach((line) => {
    (line.match(/\bt\d+\b/g) || []).forEach((t) => temps.add(t));
    (line.match(/\bL\d+\b/g) || []).forEach((l) => labels.add(l));
  });

  let text =
    `The compiler lowered your program into ${pluralize(code.length, "three address code instruction")}. ` +
    "Each instruction does at most one operation, which is what makes the next phases straightforward.";

  if (temps.size) {
    text += ` It introduced ${pluralize(temps.size, "temporary variable")} to hold intermediate results.`;
  }

  if (labels.size) {
    text += ` Control flow is now explicit: ${pluralize(labels.size, "label")} with jumps between them, replacing the loops and conditionals you wrote.`;
  }

  const sample = code.filter((l) => l.includes("=") && !l.endsWith(":")).slice(0, 2);
  if (sample.length) {
    text += ` For example, ${listItems(sample.map(humanizeCode), 2)}.`;
  }

  text +=
    " This form is machine independent, so the same intermediate code could target very different processors.";

  return text;
}

function narrateOptimization(phases) {
  const before = phases.intermediateCode || [];
  const after = phases.optimizedCode || [];

  if (!after.length) {
    return "No optimised code was produced for this input.";
  }

  const saved = before.length - after.length;

  let text = `The optimiser took ${pluralize(before.length, "instruction")} and produced ${after.length}. `;

  if (saved > 0) {
    const percent = Math.round((saved / before.length) * 100);
    text += `That removes ${pluralize(saved, "instruction")}, about ${percent} percent of the original. `;
  } else if (saved === 0) {
    text +=
      "The instruction count is unchanged, which is common for short programs where there is little redundancy to remove. ";
  } else {
    text +=
      "The instruction count went up slightly, which can happen when the optimiser trades size for speed. ";
  }

  const beforeTemps = new Set(before.join(" ").match(/\bt\d+\b/g) || []).size;
  const afterTemps = new Set(after.join(" ").match(/\bt\d+\b/g) || []).size;

  if (beforeTemps > afterTemps) {
    text += `It also cut the temporary variables from ${beforeTemps} down to ${afterTemps}, which means fewer registers are needed later. `;
  }

  text +=
    "Typical techniques here are constant folding, copy propagation, and dead code elimination, all of which preserve exactly what the program computes.";

  return text;
}

function narrateCodegen(phases) {
  const assembly = phases.assemblyCode || [];

  if (!assembly.length) {
    return "No target code was generated for this input.";
  }

  const mnemonics = {};
  assembly.forEach((line) => {
    const match = line.trim().match(/^([A-Z]+)\b/);
    if (match) mnemonics[match[1]] = (mnemonics[match[1]] || 0) + 1;
  });

  const top = Object.entries(mnemonics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${count} ${name}`);

  let text =
    `Finally, the code generator emitted ${pluralize(assembly.length, "target instruction")} for a simple register machine.`;

  if (top.length) {
    text += ` The most frequent instructions are ${listItems(top)}.`;
  }

  text +=
    " Values are loaded from memory into registers, operated on, then stored back. " +
    "Choosing which values live in which registers is the register allocation problem, and it is where real compilers spend a great deal of effort.";

  return text;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

const BUILDERS = {
  lexical: narrateLexical,
  syntax: narrateSyntax,
  semantic: narrateSemantic,
  intermediate: narrateIntermediate,
  optimization: narrateOptimization,
  codegen: narrateCodegen,
};

export const PHASE_KEYS = Object.keys(BUILDERS);

export const PHASE_TITLES = {
  lexical: "Lexical Analysis",
  syntax: "Syntax Analysis",
  semantic: "Semantic Analysis",
  intermediate: "Intermediate Code Generation",
  optimization: "Code Optimization",
  codegen: "Code Generation",
};

/**
 * Narration for one phase. Prefers the AI-written explanation, then appends
 * the data-derived detail so the numbers quoted are always the real ones.
 */
export function getPhaseNarration(phaseKey, phases) {
  if (!phases) return "";

  const builder = BUILDERS[phaseKey];
  if (!builder) return "";

  let derived;
  try {
    derived = builder(phases);
  } catch (err) {
    console.error(`Narration failed for phase "${phaseKey}":`, err);
    derived = `This is the ${PHASE_TITLES[phaseKey]} phase.`;
  }

  const aiText = phases.explanations?.[phaseKey];

  if (aiText && typeof aiText === "string" && aiText.trim()) {
    return `${aiText.trim()} ${derived}`;
  }

  return derived;
}

export { humanizeCode };
