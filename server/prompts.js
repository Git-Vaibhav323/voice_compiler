/**
 * Prompt templates used by the backend Groq proxy.
 */

export function buildCodeGenPrompt(request) {
  return `You are a C programming assistant for a compiler-design teaching tool.

The user described a program in plain language. Write a SHORT, SELF-CONTAINED C program that implements it.

Hard requirements:
- Output ONLY the C source code. No markdown fences, no explanation, no commentary.
- Keep it under 45 lines.
- Use simple classic C: int/float/char, arrays, for/while, if/else, functions.
- Avoid pointers-to-pointers, structs, malloc, file I/O and threads unless the request explicitly demands them.
- Include a main() so the program is complete.
- Prefer fixed sample data over scanf so the program is deterministic.
- Add brief comments on the key steps.

User request: ${request}`;
}

export function buildAnalysisPrompt(code) {
  return `You are a compiler expert. Analyse the C program below through all six compiler phases.

Return ONLY a valid JSON object. No markdown, no code fences, no extra text — just the JSON.

The JSON must have exactly these top-level keys:
- tokens: array of objects with keys lexeme, token, attribute
- ast: string (human-readable description of the AST)
- treeData: recursive tree object (see below)
- semanticAnalysis: object with keys typeChecking (string) and symbolTable (array)
- intermediateCode: array of strings (three-address code instructions)
- optimizedCode: array of strings (optimised TAC instructions)
- assemblyCode: array of strings (register machine instructions)
- explanations: object with keys lexical, syntax, semantic, intermediate, optimization, codegen (each a string)

TOKENS array rules:
- Each entry: { "lexeme": "...", "token": "TYPE", "attribute": "..." }
- token must be one of: KEYWORD, IDENTIFIER, CONSTANT, STRING_LITERAL, OPERATOR, PUNCTUATOR, PREPROCESSOR
- attribute holds extra info: symbol-table entry for identifiers, value for constants, meaning for operators
- Cap at 60 tokens; if truncated add a final entry with token "NOTE" and attribute "token list truncated"

TREEDATA rules:
- Root node represents the translation unit, children are function definitions
- Every node must have: "name" (string), "attributes" object with "type" and "label" (both strings)
- type must be one of: operator, identifier, literal, function, keyword, declaration, default
- Nest statements under their function, expressions under their statement
- Maximum 5 levels deep
- No circular references

SEMANTICANALYSIS rules:
- typeChecking: one sentence describing whether types are consistent
- symbolTable: array of objects each with name, type, scope (all strings)

INTERMEDIATE CODE rules:
- One operator per instruction, temporaries named t1 t2 t3 etc
- Labels use format L1: L2: etc
- Jumps use: goto L1 and ifFalse t1 goto L1
- Array access: t1 = arr[i] and arr[i] = t1
- Function calls: param x then t1 = call f, 2
- Do NOT use LOAD STORE ADD or other assembly mnemonics here

OPTIMIZED CODE rules:
- Same TAC format as intermediate code
- Apply constant folding, copy propagation, dead-code elimination where applicable
- Fine to be similar to intermediate code when few optimisations apply

ASSEMBLY CODE rules:
- Use only: LOAD, STORE, ADD, SUB, MUL, DIV, MOD, CMP, JMP, JE, JNE, JL, JG, CALL, RET
- Registers: R1 R2 R3 R4
- Preserve labels from optimised TAC

EXPLANATIONS rules:
- Each value is 2-4 sentences of conversational prose for spoken narration
- Mention real identifiers, real counts, specific optimisations from THIS program
- No markdown, no bullet points, no symbols that sound wrong when spoken aloud

C program to analyse:
${code}`;
}
