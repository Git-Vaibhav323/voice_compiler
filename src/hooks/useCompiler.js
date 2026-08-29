import { useCallback, useEffect, useState } from "react";
import {
  analyzeCodeWithAI,
  checkBackendHealth,
  generateCodeFromRequest,
} from "../services/apiService";
import { getSampleDataForCode } from "../services/localAnalyzer";

/**
 * Drives the whole pipeline:
 *   spoken request -> AI-generated C code -> six-phase analysis
 *
 * Analysis prefers the backend (which holds the Groq key). If the backend is
 * down, has no key, or returns something unusable, it falls back to the local
 * analyzer so the app still works offline.
 */
export function useCompiler() {
  const [phases, setPhases] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [lastRequest, setLastRequest] = useState("");

  const [backend, setBackend] = useState({ online: false, hasApiKey: false });

  useEffect(() => {
    let cancelled = false;

    checkBackendHealth().then((status) => {
      if (!cancelled) setBackend(status);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Basic sanity check on whatever the analysis returned. */
  const isUsable = (result) =>
    result &&
    Array.isArray(result.tokens) &&
    result.tokens.length > 0 &&
    result.treeData;

  const analyzeCode = useCallback(
    async (code) => {
      if (!code?.trim()) {
        setError("There is no code to analyze.");
        return;
      }

      setLoading(true);
      setError(null);
      setUsingFallback(false);
      setPhases(null);

      const useBackend = backend.online && backend.hasApiKey;

      if (useBackend) {
        try {
          const result = await analyzeCodeWithAI(code);

          if (isUsable(result)) {
            // Fill any gaps from the local analyzer rather than showing blanks.
            const local = getSampleDataForCode(code);

            setPhases({
              ...result,
              treeData: result.treeData || local.treeData,
              intermediateCode: result.intermediateCode?.length
                ? result.intermediateCode
                : local.intermediateCode,
              optimizedCode: result.optimizedCode?.length
                ? result.optimizedCode
                : local.optimizedCode,
              assemblyCode: result.assemblyCode?.length
                ? result.assemblyCode
                : local.assemblyCode,
            });

            setLoading(false);
            return;
          }

          throw new Error("The analysis came back incomplete.");
        } catch (err) {
          console.error("AI analysis failed, falling back locally:", err);
          setUsingFallback(true);
        }
      } else {
        setUsingFallback(true);
      }

      try {
        setPhases(getSampleDataForCode(code));
      } catch (localErr) {
        setError(`Local analysis failed: ${localErr.message}`);
      }

      setLoading(false);
    },
    [backend]
  );

  /**
   * Turn a spoken or typed request into C source. Returns the code so the
   * caller can drop it into the editor; it does not analyze automatically.
   */
  const generateCode = useCallback(async (request) => {
    setGenerating(true);
    setGenerationError(null);
    setLastRequest(request);

    try {
      const code = await generateCodeFromRequest(request);
      setGenerating(false);
      return code;
    } catch (err) {
      setGenerationError(err.message);
      setGenerating(false);
      return null;
    }
  }, []);

  return {
    phases,
    loading,
    error,
    usingFallback,
    analyzeCode,
    generating,
    generationError,
    generateCode,
    lastRequest,
    backend,
  };
}
