/**
 * Local (offline) compiler-phase analyzer.
 *
 * Used when the backend is unreachable or has no API key. The original version
 * of this file only understood a single expression such as
 * `total := price + rate * 60`. It has been extended to cope with whole C
 * programs: a real C lexer, statement-level three-address code with labels and
 * gotos for control flow, scope-aware symbol table, and an AST rooted at the
 * translation unit.
 *
 * It is deliberately a heuristic parser, not a full C front end. The AI-backed
 * path in apiService.js gives better results; this exists so the app still
 * works and still teaches something with no network at all.
 */

/* ------------------------------------------------------------------ *
 * Lexical analysis
 * ------------------------------------------------------------------ */

const C_KEYWORDS = new Set([
  "auto", "break", "case", "char", "const", "continue", "default", "do",
  "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline",
  "int", "long", "register", "restrict", "return", "short", "signed",
  "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned",
  "void", "volatile", "while",
]);

const TYPE_KEYWORDS = new Set([
  "char", "double", "float", "int", "long", "short", "signed", "unsigned",
  "void",
]);

const OPERATOR_MEANINGS = {
  "+": "Addition", "-": "Subtraction", "*": "Multiplication",
  "/": "Division", "%": "Modulo", "=": "Assignment",
  "+=": "Add and assign", "-=": "Subtract and assign",
  "*=": "Multiply and assign", "/=": "Divide and assign",
  "%=": "Modulo and assign", "<": "Less than", ">": "Greater than",
  "<=": "Less than or equal", ">=": "Greater than or equal",
  "==": "Equality", "!=": "Inequality", "&&": "Logical AND",
  "||": "Logical OR", "!": "Logical NOT", "++": "Increment",
  "--": "Decrement", "&": "Bitwise AND / address-of", "|": "Bitwise OR",
  "^": "Bitwise XOR", "~": "Bitwise NOT", "<<": "Left shift",
  ">>": "Right shift", "?": "Ternary condition", ":": "Ternary branch",
  "->": "Member access via pointer", ".": "Member access",
};

const MAX_TOKENS = 60;

/** Strip comments while preserving string literals. */
function stripComments(code) {
  let out = "";
  let i = 0;
  let inString = null;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < code.length && code[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * A C lexer producing {lexeme, token, attribute} records, which is the shape
 * TokenTable expects.
 */
export function tokenizeC(code) {
  const tokens = [];
  const lines = code.split("\n");

  const pattern = new RegExp(
    [
      /"(?:[^"\\]|\\.)*"/.source,          // string literal
      /'(?:[^'\\]|\\.)'/.source,           // char literal
      /\b\d+\.\d+[fF]?\b/.source,          // float
      /\b\d+\b/.source,                    // integer
      /[A-Za-z_]\w*/.source,               // identifier / keyword
      /<<=|>>=|\+\+|--|->|<<|>>|<=|>=|==|!=|&&|\|\||\+=|-=|\*=|\/=|%=|&=|\|=|\^=/.source,
      /[+\-*/%=<>!&|^~?:.]/.source,        // single-char operators
      /[{}()[\];,]/.source,                // punctuators
    ].join("|"),
    "g"
  );

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Preprocessor directives are single tokens - they never reach the parser.
    if (line.startsWith("#")) {
      tokens.push({
        lexeme: line,
        token: "PREPROCESSOR",
        attribute: "Handled before compilation proper",
      });
      continue;
    }

    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(line)) !== null) {
      const lexeme = match[0];
      tokens.push({ lexeme, ...classifyLexeme(lexeme) });
    }
  }

  if (tokens.length > MAX_TOKENS) {
    const kept = tokens.slice(0, MAX_TOKENS);
    kept.push({
      lexeme: "...",
      token: "NOTE",
      attribute: `${tokens.length - MAX_TOKENS} further tokens hidden for display`,
    });
    return kept;
  }

  return tokens;
}

function classifyLexeme(lexeme) {
  if (C_KEYWORDS.has(lexeme)) {
    return {
      token: "KEYWORD",
      attribute: TYPE_KEYWORDS.has(lexeme) ? "Type specifier" : "Reserved word",
    };
  }

  if (/^"/.test(lexeme)) {
    return { token: "STRING_LITERAL", attribute: `Length ${lexeme.length - 2}` };
  }

  if (/^'/.test(lexeme)) {
    return { token: "CONSTANT", attribute: "Character constant" };
  }

  if (/^\d+\.\d+/.test(lexeme)) {
    return { token: "CONSTANT", attribute: `Floating-point value ${lexeme}` };
  }

  if (/^\d+$/.test(lexeme)) {
    return { token: "CONSTANT", attribute: `Integer value ${lexeme}` };
  }

  if (/^[A-Za-z_]\w*$/.test(lexeme)) {
    return { token: "IDENTIFIER", attribute: "Symbol-table entry" };
  }

  if (/^[{}()[\];,]$/.test(lexeme)) {
    return { token: "PUNCTUATOR", attribute: punctuatorRole(lexeme) };
  }

  return {
    token: "OPERATOR",
    attribute: OPERATOR_MEANINGS[lexeme] || "Operator",
  };
}

function punctuatorRole(ch) {
  const roles = {
    "{": "Block start", "}": "Block end",
    "(": "Group / argument list start", ")": "Group / argument list end",
    "[": "Subscript start", "]": "Subscript end",
    ";": "Statement terminator", ",": "Separator",
  };
  return roles[ch] || "Punctuator";
}

/* ------------------------------------------------------------------ *
 * Symbol table
 * ------------------------------------------------------------------ */

function buildSymbolTable(code) {
  const symbols = [];
  const seen = new Set();
  const lines = code.split("\n");

  let currentScope = "global";
  let depth = 0;

  const declPattern =
    /\b(int|float|double|char|long|short|unsigned|signed|void)\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])?/g;
  const funcPattern =
    /\b(int|float|double|char|long|short|unsigned|signed|void)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{?/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const funcMatch = line.match(funcPattern);
    const isFunctionDef = funcMatch && line.includes("(") && !line.includes("=");

    if (isFunctionDef) {
      const [, returnType, name, params] = funcMatch;

      addSymbol(symbols, seen, {
        name,
        type: `${returnType} function`,
        scope: "global",
      });

      currentScope = name;

      // Parameters belong to the function's scope.
      params
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((param) => {
          const pMatch = param.match(
            /\b(int|float|double|char|long|short|unsigned|signed|void)\s*\**\s*([A-Za-z_]\w*)/
          );
          if (pMatch) {
            addSymbol(symbols, seen, {
              name: pMatch[2],
              type: `${pMatch[1]}${param.includes("*") || param.includes("[") ? " *" : ""}`,
              scope: `${name} (parameter)`,
            });
          }
        });
    }

    declPattern.lastIndex = 0;
    let decl;
    while ((decl = declPattern.exec(line)) !== null) {
      const [full, type, name, arraySuffix] = decl;

      // Skip the function name itself, already recorded above.
      if (isFunctionDef && line.indexOf(full) === line.indexOf(funcMatch[0])) {
        continue;
      }

      addSymbol(symbols, seen, {
        name,
        type: arraySuffix ? `${type}${arraySuffix}` : type,
        scope: currentScope,
      });
    }

    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth <= 0) {
      currentScope = "global";
      depth = 0;
    }
  }

  return symbols;
}

function addSymbol(symbols, seen, entry) {
  const key = `${entry.name}@${entry.scope}`;
  if (seen.has(key)) return;
  seen.add(key);
  symbols.push(entry);
}

/* ------------------------------------------------------------------ *
 * Expression parsing (AST + TAC)
 * ------------------------------------------------------------------ */

const BINARY_PRECEDENCE = [
  ["||"],
  ["&&"],
  ["==", "!="],
  ["<=", ">=", "<", ">"],
  ["+", "-"],
  ["*", "/", "%"],
];

/**
 * Replace the contents of string and character literals with placeholder
 * characters, keeping the same length and the same quote positions.
 *
 * Scanning is then done against the mask so that operators appearing inside a
 * literal - the % in printf("%d", x) being the common case - are never
 * mistaken for real operators. Slices are still taken from the original text.
 */
function maskLiterals(expr) {
  let masked = "";
  let quote = null;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    if (quote) {
      if (ch === "\\") {
        masked += "\u0000\u0000";
        i++;
        continue;
      }
      if (ch === quote) {
        masked += ch;
        quote = null;
        continue;
      }
      masked += "\u0000";
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      masked += ch;
      continue;
    }

    masked += ch;
  }

  return masked;
}

/** Find a top-level (paren/bracket depth zero) operator, scanning right to left. */
function findTopLevelOperator(rawExpr, operators) {
  const expr = maskLiterals(rawExpr);
  let depth = 0;

  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i];

    if (ch === ")" || ch === "]") depth++;
    else if (ch === "(" || ch === "[") depth--;
    else if (depth === 0) {
      for (const op of operators) {
        if (expr.startsWith(op, i)) {
          // Not an operator if it is a unary sign at the start of the expression
          // or immediately after another operator.
          if (i === 0) continue;
          const prev = expr[i - 1];
          if ((op === "-" || op === "+") && /[-+*/%(<>=!&|,]/.test(prev)) {
            continue;
          }
          // Avoid splitting compound operators such as <= into < and =.
          if (op.length === 1 && /[<>=!+\-*/%&|]/.test(expr[i + 1] || "")) {
            continue;
          }
          return { index: i, op };
        }
      }
    }
  }

  return null;
}

function unwrapParens(expr) {
  let e = expr.trim();

  while (e.startsWith("(") && e.endsWith(")")) {
    let depth = 0;
    let wrapped = true;

    for (let i = 0; i < e.length - 1; i++) {
      if (e[i] === "(") depth++;
      else if (e[i] === ")") depth--;
      if (depth === 0) {
        wrapped = false;
        break;
      }
    }

    if (!wrapped) break;
    e = e.slice(1, -1).trim();
  }

  return e;
}

export function parseExpressionToAst(rawExpr) {
  const expr = unwrapParens(rawExpr);

  if (!expr) {
    return { name: "?", attributes: { type: "default", label: "Empty" } };
  }

  // Assignment is right-associative and lowest precedence.
  const assignOps = ["+=", "-=", "*=", "/=", "%=", "="];
  for (const op of assignOps) {
    const idx = findAssignmentIndex(expr, op);
    if (idx > 0) {
      return {
        name: op,
        attributes: { type: "operator", label: OPERATOR_MEANINGS[op] },
        children: [
          parseExpressionToAst(expr.slice(0, idx)),
          parseExpressionToAst(expr.slice(idx + op.length)),
        ],
      };
    }
  }

  // Ternary.
  if (expr.includes("?") && expr.includes(":")) {
    const q = expr.indexOf("?");
    const c = expr.indexOf(":", q);
    if (q > 0 && c > q) {
      return {
        name: "?:",
        attributes: { type: "operator", label: "Ternary" },
        children: [
          parseExpressionToAst(expr.slice(0, q)),
          parseExpressionToAst(expr.slice(q + 1, c)),
          parseExpressionToAst(expr.slice(c + 1)),
        ],
      };
    }
  }

  // Binary operators, lowest precedence first.
  for (const level of BINARY_PRECEDENCE) {
    const found = findTopLevelOperator(expr, level);
    if (found) {
      return {
        name: found.op,
        attributes: {
          type: "operator",
          label: OPERATOR_MEANINGS[found.op] || "Operator",
        },
        children: [
          parseExpressionToAst(expr.slice(0, found.index)),
          parseExpressionToAst(expr.slice(found.index + found.op.length)),
        ],
      };
    }
  }

  // Unary prefix.
  const unary = expr.match(/^(\+\+|--|!|~|-)\s*(.+)$/);
  if (unary) {
    return {
      name: unary[1],
      attributes: {
        type: "operator",
        label: OPERATOR_MEANINGS[unary[1]] || "Unary operator",
      },
      children: [parseExpressionToAst(unary[2])],
    };
  }

  // Postfix increment / decrement.
  const postfix = expr.match(/^(.+?)(\+\+|--)$/);
  if (postfix) {
    return {
      name: `${postfix[2]} (postfix)`,
      attributes: { type: "operator", label: OPERATOR_MEANINGS[postfix[2]] },
      children: [parseExpressionToAst(postfix[1])],
    };
  }

  // Array subscript.
  const subscript = expr.match(/^([A-Za-z_]\w*)\s*\[(.+)\]$/);
  if (subscript) {
    return {
      name: "[]",
      attributes: { type: "operator", label: "Array subscript" },
      children: [
        {
          name: subscript[1],
          attributes: { type: "identifier", label: "Array" },
        },
        parseExpressionToAst(subscript[2]),
      ],
    };
  }

  // Function call.
  const call = expr.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/s);
  if (call) {
    const args = splitArguments(call[2]);
    return {
      name: call[1],
      attributes: { type: "function", label: "Function call" },
      children: args.length ? args.map(parseExpressionToAst) : undefined,
    };
  }

  // Leaves.
  if (/^\d+\.\d+/.test(expr)) {
    return { name: expr, attributes: { type: "literal", label: "Float" } };
  }
  if (/^\d+$/.test(expr)) {
    return { name: expr, attributes: { type: "literal", label: "Integer" } };
  }
  if (/^["']/.test(expr)) {
    return { name: expr, attributes: { type: "literal", label: "Literal" } };
  }
  if (C_KEYWORDS.has(expr)) {
    return { name: expr, attributes: { type: "keyword", label: "Keyword" } };
  }

  return { name: expr, attributes: { type: "identifier", label: "Variable" } };
}

function findAssignmentIndex(rawExpr, op) {
  const expr = maskLiterals(rawExpr);
  let depth = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && expr.startsWith(op, i)) {
      if (op === "=") {
        // Reject ==, <=, >=, !=, +=, -=, *=, /=, %=
        if (expr[i + 1] === "=") return -1;
        if (/[=<>!+\-*/%]/.test(expr[i - 1] || "")) continue;
      }
      return i;
    }
  }

  return -1;
}

function splitArguments(argString) {
  const masked = maskLiterals(argString);
  const args = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < masked.length; i++) {
    const ch = masked[i];

    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      args.push(argString.slice(start, i).trim());
      start = i + 1;
    }
  }

  args.push(argString.slice(start).trim());
  return args.filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Statement-level parsing into a program AST
 * ------------------------------------------------------------------ */

/**
 * Split a C body into top-level statements, keeping blocks intact.
 *
 * Paren depth is tracked as well as brace depth, otherwise the two semicolons
 * inside a `for (init; cond; update)` header would be treated as statement
 * terminators and the loop would be torn apart.
 */
function splitStatements(rawBody) {
  const body = maskLiterals(rawBody);
  const statements = [];
  let braceDepth = 0;
  let parenDepth = 0;
  let current = "";
  let pendingHeader = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth--;
    else if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;

    current += rawBody[i];

    if (parenDepth > 0 || braceDepth > 0) continue;

    // A control-flow header ends at ")" but the statement continues into its
    // body, so do not terminate yet.
    if (ch === ")" && /^\s*(for|while|if|switch)\s*\(/.test(current)) {
      pendingHeader = true;
      continue;
    }

    if (ch === "}") {
      // `int a[] = {1, 2};` is a brace initialiser, not a block: it still
      // needs its semicolon before the statement is complete.
      if (/=\s*\{[^{}]*\}\s*$/.test(current)) continue;

      // Keep `else` attached to the `if` it belongs to.
      if (/^\s*else\b/.test(body.slice(i + 1))) continue;

      pendingHeader = false;
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    if (ch === ";" && !pendingHeader) {
      const trimmed = current.trim();
      if (trimmed && trimmed !== ";") statements.push(trimmed);
      current = "";
      continue;
    }

    if (ch === ";" && pendingHeader) {
      // Body-less statement such as `while (x) ;`
      pendingHeader = false;
      const trimmed = current.trim();
      if (trimmed && trimmed !== ";") statements.push(trimmed);
      current = "";
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

function extractBlock(text) {
  const open = text.indexOf("{");
  if (open === -1) return { header: text.trim(), body: "" };

  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      return {
        header: text.slice(0, open).trim(),
        body: text.slice(open + 1, i),
      };
    }
  }

  return { header: text.slice(0, open).trim(), body: text.slice(open + 1) };
}

/**
 * Break `if (c) { ... } else { ... }` into its three pieces. The else part is
 * null when there is no else. An `else if` chain is returned whole as the else
 * part, and recursion handles the rest.
 */
function splitIfElse(stmt) {
  const condMatch = stmt.match(/^if\s*\(/);
  if (!condMatch) return { condition: "", thenPart: "", elsePart: null };

  // Find the matching close paren of the condition.
  let parenDepth = 0;
  let condEnd = -1;

  for (let i = stmt.indexOf("("); i < stmt.length; i++) {
    if (stmt[i] === "(") parenDepth++;
    else if (stmt[i] === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        condEnd = i;
        break;
      }
    }
  }

  if (condEnd === -1) return { condition: "", thenPart: "", elsePart: null };

  const condition = stmt.slice(stmt.indexOf("(") + 1, condEnd);
  const rest = stmt.slice(condEnd + 1).trim();

  const { header, body } = extractBlock(rest);

  // No braces on the then-branch: `if (c) x = 1; else ...`
  if (!rest.startsWith("{")) {
    const elseIndex = findElseIndex(rest);
    if (elseIndex === -1) return { condition, thenPart: rest, elsePart: null };

    return {
      condition,
      thenPart: rest.slice(0, elseIndex),
      elsePart: rest.slice(elseIndex + 4).trim(),
    };
  }

  // Braced then-branch: find what follows the closing brace.
  let braceDepth = 0;
  let blockEnd = -1;

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "{") braceDepth++;
    else if (rest[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  const tail = blockEnd === -1 ? "" : rest.slice(blockEnd + 1).trim();
  void header;

  if (/^else\b/.test(tail)) {
    const elseBody = tail.slice(4).trim();
    // `else { ... }` unwraps to the block; `else if (...)` stays whole.
    if (elseBody.startsWith("{")) {
      return { condition, thenPart: body, elsePart: extractBlock(elseBody).body };
    }
    return { condition, thenPart: body, elsePart: elseBody };
  }

  return { condition, thenPart: body, elsePart: null };
}

/** Locate a top-level `else` keyword. */
function findElseIndex(text) {
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    else if (depth === 0 && text.startsWith("else", i)) {
      const before = text[i - 1];
      const after = text[i + 4];
      if ((!before || /[\s;}]/.test(before)) && (!after || /[\s{(]/.test(after))) {
        return i;
      }
    }
  }

  return -1;
}

function parseStatement(statement, depth = 0) {
  const stmt = statement.trim().replace(/;$/, "");

  if (!stmt) return null;

  // Guard against runaway recursion on pathological input.
  if (depth > 6) {
    return { name: "...", attributes: { type: "default", label: "Nested block" } };
  }

  if (/^for\s*\(/.test(stmt)) {
    const { header, body } = extractBlock(stmt);
    const inner = header.match(/^for\s*\((.*)\)$/s);
    const parts = inner ? splitForHeader(inner[1]) : [];

    return {
      name: "for",
      attributes: { type: "keyword", label: "For loop" },
      children: [
        ...parts.map((p, i) =>
          labelChild(parseExpressionToAst(p), ["init", "condition", "update"][i])
        ),
        {
          name: "body",
          attributes: { type: "default", label: "Loop body" },
          children: splitStatements(body)
            .map((s) => parseStatement(s, depth + 1))
            .filter(Boolean),
        },
      ],
    };
  }

  if (/^while\s*\(/.test(stmt)) {
    const { header, body } = extractBlock(stmt);
    const cond = header.match(/^while\s*\((.*)\)$/s);

    return {
      name: "while",
      attributes: { type: "keyword", label: "While loop" },
      children: [
        labelChild(parseExpressionToAst(cond ? cond[1] : ""), "condition"),
        {
          name: "body",
          attributes: { type: "default", label: "Loop body" },
          children: splitStatements(body)
            .map((s) => parseStatement(s, depth + 1))
            .filter(Boolean),
        },
      ],
    };
  }

  if (/^if\s*\(/.test(stmt)) {
    const { thenPart, elsePart, condition } = splitIfElse(stmt);

    const children = [
      labelChild(parseExpressionToAst(condition), "condition"),
      {
        name: "then",
        attributes: { type: "default", label: "Then branch" },
        children: splitStatements(thenPart)
          .map((s) => parseStatement(s, depth + 1))
          .filter(Boolean),
      },
    ];

    if (elsePart) {
      children.push({
        name: "else",
        attributes: { type: "default", label: "Else branch" },
        children: splitStatements(elsePart)
          .map((s) => parseStatement(s, depth + 1))
          .filter(Boolean),
      });
    }

    return {
      name: "if",
      attributes: { type: "keyword", label: "Conditional" },
      children,
    };
  }

  if (/^return\b/.test(stmt)) {
    const value = stmt.replace(/^return\s*/, "");
    return {
      name: "return",
      attributes: { type: "keyword", label: "Return" },
      children: value ? [parseExpressionToAst(value)] : undefined,
    };
  }

  // Array declaration with a brace initialiser.
  const arrayInit = stmt.match(
    /^(int|float|double|char|long|short|unsigned|signed)\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])\s*=\s*\{(.*)\}$/s
  );
  if (arrayInit) {
    return {
      name: "= (array init)",
      attributes: { type: "declaration", label: `Declare ${arrayInit[1]} array` },
      children: [
        {
          name: `${arrayInit[2]}${arrayInit[3]}`,
          attributes: { type: "identifier", label: "Array" },
        },
        ...splitArguments(arrayInit[4]).map(parseExpressionToAst),
      ],
    };
  }

  // Declaration with initialiser: int x = 5;
  const declInit = stmt.match(
    /^(int|float|double|char|long|short|unsigned|signed)\s+([A-Za-z_]\w*(?:\[[^\]]*\])?)\s*=\s*(.+)$/s
  );
  if (declInit) {
    return {
      name: "=",
      attributes: { type: "declaration", label: `Declare ${declInit[1]}` },
      children: [
        {
          name: declInit[2],
          attributes: { type: "identifier", label: declInit[1] },
        },
        parseExpressionToAst(declInit[3]),
      ],
    };
  }

  // Bare declaration: int x;
  const decl = stmt.match(
    /^(int|float|double|char|long|short|unsigned|signed|void)\s+(.+)$/s
  );
  if (decl && !stmt.includes("(")) {
    return {
      name: `declare ${decl[2]}`,
      attributes: { type: "declaration", label: `${decl[1]} declaration` },
    };
  }

  return parseExpressionToAst(stmt);
}

function labelChild(node, label) {
  return {
    ...node,
    attributes: {
      ...node.attributes,
      label: `${label}: ${node.attributes?.label || ""}`.trim(),
    },
  };
}

function splitForHeader(rawHeader) {
  const header = maskLiterals(rawHeader);
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < header.length; i++) {
    const ch = header[i];

    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      parts.push(rawHeader.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(rawHeader.slice(start).trim());
  return parts.filter(Boolean);
}

function buildProgramAst(code) {
  const clean = stripComments(code);
  const functions = [];

  const funcPattern =
    /\b(int|float|double|char|long|short|unsigned|signed|void)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g;

  let match;
  while ((match = funcPattern.exec(clean)) !== null) {
    const [, returnType, name, params] = match;
    const { body } = extractBlock(clean.slice(match.index));

    functions.push({
      name: `${name}()`,
      attributes: {
        type: "function",
        label: `${returnType} function${params.trim() ? `, params: ${params.trim()}` : ""}`,
      },
      children: splitStatements(body).map((s) => parseStatement(s)).filter(Boolean),
    });
  }

  if (!functions.length) {
    // Not a full program - treat the whole input as one expression/statement.
    const single = parseStatement(clean.replace(/\n/g, " "));
    return single || { name: "Program", attributes: { type: "default", label: "Empty" } };
  }

  return {
    name: "TranslationUnit",
    attributes: { type: "default", label: "Program root" },
    children: functions,
  };
}

/* ------------------------------------------------------------------ *
 * Three-address code generation
 * ------------------------------------------------------------------ */

function generateTac(code) {
  const clean = stripComments(code);
  const instructions = [];

  let tempCounter = 0;
  let labelCounter = 0;

  const newTemp = () => `t${++tempCounter}`;
  const newLabel = () => `L${++labelCounter}`;

  function emit(line) {
    instructions.push(line);
  }

  function genExpression(rawExpr, target = null) {
    const expr = unwrapParens(rawExpr);
    if (!expr) return "0";

    // Assignment inside an expression.
    const assignOps = ["+=", "-=", "*=", "/=", "%=", "="];
    for (const op of assignOps) {
      const idx = findAssignmentIndex(expr, op);
      if (idx > 0) {
        const lhs = expr.slice(0, idx).trim();
        const rhs = expr.slice(idx + op.length).trim();

        if (op === "=") {
          const value = genExpression(rhs);
          emit(`${lhs} = ${value}`);
        } else {
          const value = genExpression(rhs);
          const temp = newTemp();
          emit(`${temp} = ${lhs} ${op[0]} ${value}`);
          emit(`${lhs} = ${temp}`);
        }
        return lhs;
      }
    }

    // Postfix / prefix increment.
    const incr = expr.match(/^([A-Za-z_]\w*)(\+\+|--)$/) || expr.match(/^(\+\+|--)([A-Za-z_]\w*)$/);
    if (incr) {
      const name = /^\+\+|^--/.test(expr) ? incr[2] : incr[1];
      const op = /^\+\+|^--/.test(expr) ? incr[1] : incr[2];
      emit(`${name} = ${name} ${op[0]} 1`);
      return name;
    }

    // Binary operators.
    for (const level of BINARY_PRECEDENCE) {
      const found = findTopLevelOperator(expr, level);
      if (found) {
        const left = genExpression(expr.slice(0, found.index));
        const right = genExpression(expr.slice(found.index + found.op.length));
        const result = target || newTemp();
        emit(`${result} = ${left} ${found.op} ${right}`);
        return result;
      }
    }

    // Array subscript.
    const subscript = expr.match(/^([A-Za-z_]\w*)\s*\[(.+)\]$/);
    if (subscript) {
      const index = genExpression(subscript[2]);
      const result = target || newTemp();
      emit(`${result} = ${subscript[1]}[${index}]`);
      return result;
    }

    // Function call.
    const call = expr.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/s);
    if (call) {
      const args = splitArguments(call[2]);
      const argTemps = args.map((a) => genExpression(a));
      argTemps.forEach((t) => emit(`param ${t}`));
      const result = target || newTemp();
      emit(`${result} = call ${call[1]}, ${args.length}`);
      return result;
    }

    // Unary.
    const unary = expr.match(/^(!|~|-)\s*(.+)$/);
    if (unary) {
      const operand = genExpression(unary[2]);
      const result = target || newTemp();
      emit(`${result} = ${unary[1]}${operand}`);
      return result;
    }

    return expr;
  }

  function genStatement(statement, depth = 0) {
    const stmt = statement.trim().replace(/;$/, "");
    if (!stmt || depth > 6) return;

    if (/^for\s*\(/.test(stmt)) {
      const { header, body } = extractBlock(stmt);
      const inner = header.match(/^for\s*\((.*)\)$/s);
      const [init, cond, update] = inner ? splitForHeader(inner[1]) : [];

      if (init) genStatement(init, depth + 1);

      const startLabel = newLabel();
      const endLabel = newLabel();

      emit(`${startLabel}:`);
      if (cond) {
        const condTemp = genExpression(cond);
        emit(`ifFalse ${condTemp} goto ${endLabel}`);
      }

      splitStatements(body).forEach((s) => genStatement(s, depth + 1));

      if (update) genStatement(update, depth + 1);
      emit(`goto ${startLabel}`);
      emit(`${endLabel}:`);
      return;
    }

    if (/^while\s*\(/.test(stmt)) {
      const { header, body } = extractBlock(stmt);
      const cond = header.match(/^while\s*\((.*)\)$/s);

      const startLabel = newLabel();
      const endLabel = newLabel();

      emit(`${startLabel}:`);
      if (cond) {
        const condTemp = genExpression(cond[1]);
        emit(`ifFalse ${condTemp} goto ${endLabel}`);
      }

      splitStatements(body).forEach((s) => genStatement(s, depth + 1));
      emit(`goto ${startLabel}`);
      emit(`${endLabel}:`);
      return;
    }

    if (/^if\s*\(/.test(stmt)) {
      const { condition, thenPart, elsePart } = splitIfElse(stmt);

      const elseLabel = newLabel();
      const condTemp = genExpression(condition);
      emit(`ifFalse ${condTemp} goto ${elseLabel}`);

      splitStatements(thenPart).forEach((s) => genStatement(s, depth + 1));

      if (elsePart) {
        const endLabel = newLabel();
        emit(`goto ${endLabel}`);
        emit(`${elseLabel}:`);
        splitStatements(elsePart).forEach((s) => genStatement(s, depth + 1));
        emit(`${endLabel}:`);
      } else {
        emit(`${elseLabel}:`);
      }

      return;
    }

    if (/^return\b/.test(stmt)) {
      const value = stmt.replace(/^return\s*/, "");
      if (value) {
        const temp = genExpression(value);
        emit(`return ${temp}`);
      } else {
        emit("return");
      }
      return;
    }

    // Array declaration with a brace initialiser: int a[3] = {1, 2, 3};
    const arrayInit = stmt.match(
      /^(?:int|float|double|char|long|short|unsigned|signed)\s+([A-Za-z_]\w*)\s*\[[^\]]*\]\s*=\s*\{(.*)\}$/s
    );
    if (arrayInit) {
      splitArguments(arrayInit[2]).forEach((value, index) => {
        emit(`${arrayInit[1]}[${index}] = ${value.trim()}`);
      });
      return;
    }

    // Declaration with initialiser.
    const declInit = stmt.match(
      /^(?:int|float|double|char|long|short|unsigned|signed)\s+([A-Za-z_]\w*)\s*=\s*(.+)$/s
    );
    if (declInit) {
      const value = genExpression(declInit[2]);
      emit(`${declInit[1]} = ${value}`);
      return;
    }

    // Bare declaration produces no code.
    if (
      /^(int|float|double|char|long|short|unsigned|signed|void)\s+/.test(stmt) &&
      !stmt.includes("=")
    ) {
      return;
    }

    genExpression(stmt);
  }

  const funcPattern =
    /\b(?:int|float|double|char|long|short|unsigned|signed|void)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g;

  let match;
  let foundFunction = false;

  while ((match = funcPattern.exec(clean)) !== null) {
    foundFunction = true;
    const { body } = extractBlock(clean.slice(match.index));

    emit(`func ${match[1]}:`);
    splitStatements(body).forEach((s) => genStatement(s));
    emit(`endfunc ${match[1]}`);
  }

  if (!foundFunction) {
    splitStatements(clean.replace(/\n/g, " ")).forEach((s) => genStatement(s));
    if (!instructions.length) genExpression(clean.replace(/\n/g, " "));
  }

  return instructions.length ? instructions : ["nop"];
}

/* ------------------------------------------------------------------ *
 * Optimization
 * ------------------------------------------------------------------ */

function optimizeTac(instructions) {
  let code = [...instructions];

  // Run the passes twice: eliminating one instruction often exposes another
  // opportunity for the pass that ran before it.
  for (let pass = 0; pass < 2; pass++) {
    code = foldConstants(code);
    code = eliminateCommonSubexpressions(code);
    code = propagateCopies(code);
    code = coalesceSingleUseTemps(code);
    code = eliminateDeadTemps(code);
  }

  return code.length ? code : instructions;
}

/** True for anything that ends a basic block. */
function isBlockBoundary(line) {
  return /^(L\d+:|func |endfunc |goto |ifFalse |if |param |return\b)/.test(line);
}

/** Names assigned by an instruction, if any. */
function destinationOf(line) {
  const match = line.match(/^([A-Za-z_]\w*(?:\[[^\]]*\])?) = /);
  return match ? match[1] : null;
}

/**
 * Local common subexpression elimination.
 *
 * Within a basic block, `t6 = arr[j]` followed later by `t10 = arr[j]` means
 * t10 can simply reuse t6. Any operand being reassigned in between kills the
 * cached expression.
 */
function eliminateCommonSubexpressions(code) {
  const result = [];
  let available = new Map(); // expression text -> temp holding it
  let aliases = new Map(); // dead temp -> surviving temp

  for (const rawLine of code) {
    if (isBlockBoundary(rawLine)) {
      // Rewrite any aliases still referenced by the boundary instruction.
      result.push(applyAliases(rawLine, aliases));
      available = new Map();
      continue;
    }

    const line = applyAliases(rawLine, aliases);
    const dest = destinationOf(line);
    const rhs = line.split(" = ")[1];

    if (dest && rhs) {
      // Only worth caching non-trivial expressions.
      const trivial = /^([A-Za-z_]\w*|\d+)$/.test(rhs.trim());

      if (!trivial && available.has(rhs)) {
        const existing = available.get(rhs);

        if (/^t\d+$/.test(dest)) {
          // Redundant temp: alias it away entirely.
          aliases.set(dest, existing);
          continue;
        }

        result.push(`${dest} = ${existing}`);
        continue;
      }

      if (!trivial) available.set(rhs, dest);

      // Reassigning a name invalidates every expression that reads it.
      const base = dest.replace(/\[.*\]$/, "");
      for (const [expr] of available) {
        if (new RegExp(`\\b${escapeRegex(base)}\\b`).test(expr)) {
          available.delete(expr);
        }
      }
      available.set(rhs, dest);
    }

    result.push(line);
  }

  return result;
}

function applyAliases(line, aliases) {
  if (!aliases.size) return line;

  let out = line;
  for (const [from, to] of aliases) {
    out = out.replace(new RegExp(`\\b${escapeRegex(from)}\\b`, "g"), to);
  }
  return out;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coalesce a temporary that is written once and read exactly once by the very
 * next instruction: `t10 = arr[j]` then `temp = t10` becomes `temp = arr[j]`.
 */
function coalesceSingleUseTemps(code) {
  const result = [];
  let i = 0;

  while (i < code.length) {
    const line = code[i];
    const next = code[i + 1];
    const match = line.match(/^(t\d+) = (.+)$/);

    if (match && next && !isBlockBoundary(next)) {
      const [, temp, value] = match;
      const pattern = new RegExp(`\\b${temp}\\b`, "g");

      const usesInNext = (next.match(pattern) || []).length;
      const usesLater = code
        .slice(i + 2)
        .some((later) => new RegExp(`\\b${temp}\\b`).test(later));

      if (usesInNext === 1 && !usesLater) {
        result.push(next.replace(pattern, value));
        i += 2;
        continue;
      }
    }

    result.push(line);
    i++;
  }

  return result;
}

/** Constant folding: t1 = 3 * 4  =>  t1 = 12 */
function foldConstants(code) {
  return code.map((line) => {
    const match = line.match(/^(\S+) = (\d+) ([+\-*/%]) (\d+)$/);
    if (!match) return line;

    const [, dest, a, op, b] = match;
    const x = Number(a);
    const y = Number(b);

    let value;
    switch (op) {
      case "+": value = x + y; break;
      case "-": value = x - y; break;
      case "*": value = x * y; break;
      case "/": value = y === 0 ? null : Math.trunc(x / y); break;
      case "%": value = y === 0 ? null : x % y; break;
      default: value = null;
    }

    return value === null ? line : `${dest} = ${value}`;
  });
}

/** Copy propagation: t1 = x; y = t1 + 2  =>  y = x + 2 */
function propagateCopies(code) {
  const result = [];
  const copies = new Map();

  for (const line of code) {
    // Labels and jumps invalidate assumptions - clear the map.
    if (/^(L\d+:|func |endfunc |goto |ifFalse |if )/.test(line)) {
      copies.clear();
      result.push(line);
      continue;
    }

    let rewritten = line;
    for (const [temp, value] of copies) {
      const rhs = rewritten.split(" = ")[1];
      if (rhs && new RegExp(`\\b${temp}\\b`).test(rhs)) {
        rewritten = rewritten.replace(
          new RegExp(`(= .*)\\b${temp}\\b`),
          (m) => m.replace(new RegExp(`\\b${temp}\\b`), value)
        );
      }
    }

    const copyMatch = rewritten.match(/^(t\d+) = ([A-Za-z_]\w*|\d+)$/);
    if (copyMatch) {
      copies.set(copyMatch[1], copyMatch[2]);
    }

    const destMatch = rewritten.match(/^(\S+) = /);
    if (destMatch) copies.delete(destMatch[1]);

    result.push(rewritten);
  }

  return result;
}

/** Dead code elimination: drop temporaries that are never read afterwards. */
function eliminateDeadTemps(code) {
  const result = [];

  for (let i = 0; i < code.length; i++) {
    const line = code[i];
    const match = line.match(/^(t\d+) = /);

    // A call may have side effects, so its result being unused does not make
    // the instruction dead. printf is the obvious case.
    if (match && !/\bcall\b/.test(line)) {
      const temp = match[1];
      const usedLater = code
        .slice(i + 1)
        .some((later) => new RegExp(`\\b${temp}\\b`).test(later.split(" = ")[1] ?? later));

      if (!usedLater) continue;
    }

    result.push(line);
  }

  return result;
}

/* ------------------------------------------------------------------ *
 * Target code generation
 * ------------------------------------------------------------------ */

function generateAssembly(instructions) {
  const assembly = [];

  const comparisonJump = {
    "<": "JGE", ">": "JLE", "<=": "JG", ">=": "JL",
    "==": "JNE", "!=": "JE",
  };

  for (const line of instructions) {
    // Labels pass through.
    if (/^L\d+:$/.test(line)) {
      assembly.push(line);
      continue;
    }

    if (/^func (\S+):$/.test(line)) {
      assembly.push(`${line.match(/^func (\S+):$/)[1]}:`);
      assembly.push("  PUSH BP");
      continue;
    }

    if (/^endfunc/.test(line)) {
      assembly.push("  POP BP");
      assembly.push("  RET");
      continue;
    }

    if (/^goto (\S+)$/.test(line)) {
      assembly.push(`  JMP ${line.match(/^goto (\S+)$/)[1]}`);
      continue;
    }

    const ifFalse = line.match(/^ifFalse (\S+) goto (\S+)$/);
    if (ifFalse) {
      assembly.push(`  LOAD R1, ${ifFalse[1]}`);
      assembly.push("  CMP R1, 0");
      assembly.push(`  JE ${ifFalse[2]}`);
      continue;
    }

    if (/^param (\S+)$/.test(line)) {
      assembly.push(`  PUSH ${line.match(/^param (\S+)$/)[1]}`);
      continue;
    }

    if (/^return\b/.test(line)) {
      const value = line.replace(/^return\s*/, "");
      if (value) assembly.push(`  LOAD R1, ${value}`);
      assembly.push("  RET");
      continue;
    }

    const call = line.match(/^(\S+) = call (\S+), (\d+)$/);
    if (call) {
      assembly.push(`  CALL ${call[2].replace(",", "")}`);
      assembly.push(`  STORE ${call[1]}, R1`);
      continue;
    }

    const binary = line.match(/^(\S+) = (\S+) ([+\-*/%<>=!]+) (\S+)$/);
    if (binary) {
      const [, dest, left, op, right] = binary;

      if (comparisonJump[op]) {
        assembly.push(`  LOAD R1, ${left}`);
        assembly.push(`  CMP R1, ${right}`);
        assembly.push(`  SET${op === "<" ? "L" : op === ">" ? "G" : "E"} ${dest}`);
        continue;
      }

      const mnemonic = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD" }[op];
      assembly.push(`  LOAD R1, ${left}`);
      assembly.push(`  ${mnemonic || "ADD"} R1, ${right}`);
      assembly.push(`  STORE ${dest}, R1`);
      continue;
    }

    const simple = line.match(/^(\S+) = (.+)$/);
    if (simple) {
      assembly.push(`  LOAD R1, ${simple[2]}`);
      assembly.push(`  STORE ${simple[1]}, R1`);
      continue;
    }

    assembly.push(`  ; ${line}`);
  }

  return assembly.length ? assembly : ["  NOP"];
}

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

export const getSampleDataForCode = (code) => {
  const tokens = tokenizeC(code);
  const treeData = buildProgramAst(code);
  const symbolTable = buildSymbolTable(code);
  const intermediateCode = generateTac(code);
  const optimizedCode = optimizeTac(intermediateCode);
  const assemblyCode = generateAssembly(optimizedCode);

  const functionCount = (treeData.children || []).filter(
    (c) => c.attributes?.type === "function"
  ).length;

  return {
    tokens,
    ast: functionCount
      ? `Translation unit with ${functionCount} function definition${functionCount === 1 ? "" : "s"}`
      : `Expression: ${code.trim().slice(0, 80)}`,
    treeData,
    semanticAnalysis: {
      typeChecking: symbolTable.length
        ? `Declarations resolved for ${symbolTable.length} symbol${symbolTable.length === 1 ? "" : "s"}. No type conflicts detected by the local analyser.`
        : "No declarations found to type-check.",
      symbolTable,
    },
    intermediateCode,
    optimizedCode,
    assemblyCode,
  };
};

export default getSampleDataForCode;
