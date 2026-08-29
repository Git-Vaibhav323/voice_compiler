/**
 * Prompt templates used by the backend Groq proxy.
 *
 * Two distinct jobs:
 *   1. buildCodeGenPrompt  - turn a spoken/typed request into a C program
 *   2. buildAnalysisPrompt - run that program through all six compiler phases
 */

export function buildCodeGenPrompt(request) {
  return `You are a C programming assistant for a compiler-design teaching tool.

The user described a program in plain language. Write a SHORT, SELF-CONTAINED C
program that implements it.

Hard requirements:
- Output ONLY the C source code. No markdown fences, no explanation, no commentary.
- Keep it under 45 lines. This code is fed into a compiler-phase visualiser,
  so brevity matters more than completeness.
- Use simple, classic C: int/float/char, arrays, for/while, if/else, functions.
- Avoid pointers-to-pointers, structs, malloc, file I/O and threads unless the
  request explicitly demands them.
- Include a main() so the program is complete.
- Prefer fixed sample data over scanf so the program is deterministic.
- Add brief comments on the key steps.

User request: ${request}`;
}

export function buildAnalysisPrompt(code) {
  return `You are a compiler expert. Analyse the following C program through all six
compiler phases and return ONLY a JSON object with this exact structure:

{
  "tokens": [{"lexeme": string, "token": string, "attribute": string}],
  "ast": string,
  "treeData": {
    "name": string,
    "attributes": {"type": string, "label": string},
    "children": [...]
  },
  "semanticAnalysis": {
    "typeChecking": string,
    "symbolTable": [{"name": string, "type": string, "scope": string}]
  },
  "intermediateCode": [string],
  "optimizedCode": [string],
  "assemblyCode": [string],
  "explanations": {
    "lexical": string,
    "syntax": string,
    "semantic": string,
    "intermediate": string,
    "optimization": string,
    "codegen": string
  }
}

Code to analyse:
\`\`\`c
${code}
\`\`\`

TOKENS
- Classify every lexeme with "token" as one of: KEYWORD, IDENTIFIER, CONSTANT,
  STRING_LITERAL, OPERATOR, PUNCTUATOR, PREPROCESSOR.
- "attribute" holds extra detail: the symbol-table entry for identifiers, the
  literal value for constants, the operator meaning for operators.
- Cap the list at 60 tokens. If the program is longer, cover the most
  instructive ones and make the last entry {"lexeme":"...","token":"NOTE",
  "attribute":"token list truncated for display"}.

TREEDATA (abstract syntax tree)
- Root node is the translation unit; its children are the function definitions.
- Every node needs "name" and "attributes" with "type" and "label".
- "type" must be one of: "operator", "identifier", "literal", "function",
  "keyword", "declaration", "default".
- Nest statements under their function, and expressions under their statement.
- Respect C operator precedence.
- Keep the tree at most 5 levels deep so it stays readable on screen.

INTERMEDIATE CODE (three-address code)
- One operator per instruction, temporaries named t1, t2, ...
- Use labels (L1:, L2:) plus "goto L1" and "if x < y goto L1" for control flow.
- Represent loops and conditionals properly; do NOT flatten them away.
- Array access is "t1 = arr[i]" and "arr[i] = t1".
- Function calls are "param x" then "t1 = call f, 2".
- Never emit assembly mnemonics (LOAD/STORE/ADD) in this phase.

OPTIMIZED CODE
- Apply constant folding, constant propagation, copy propagation, dead-code
  elimination, common-subexpression elimination and loop-invariant code motion
  where they genuinely apply.
- Keep the same TAC format. It is fine for this to be similar to the
  unoptimised version when few optimisations apply.

ASSEMBLY CODE
- Target a simple register machine: LOAD, STORE, ADD, SUB, MUL, DIV, MOD, CMP,
  JMP, JE, JNE, JL, JG, CALL, RET, with registers R1-R4.
- Preserve the labels used by the optimised TAC.

EXPLANATIONS
- Each explanation is 2-4 sentences of spoken narration, read aloud to a
  student. Plain conversational prose.
- Refer to what actually happened in THIS program: name real identifiers, real
  token counts, the specific optimisation applied.
- No markdown, no bullet points, no code fences, no symbols that sound wrong
  when spoken aloud.

Return only valid JSON.`;
}
