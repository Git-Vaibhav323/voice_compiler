import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text via the Web Speech API (SpeechRecognition).
 *
 * Availability is uneven: Chrome, Edge and Safari support it behind the
 * webkit prefix, Firefox does not implement it at all. `supported` is exposed
 * so the UI can fall back to typing rather than showing a dead button.
 */
export function useSpeechRecognition({ onResult } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalRef.current += text;
        } else {
          interimText += text;
        }
      }

      setTranscript(finalRef.current);
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setError(
            "Microphone access was blocked. Allow it in your browser settings and try again."
          );
          break;
        case "no-speech":
          setError("No speech was detected. Try speaking a little louder.");
          break;
        case "audio-capture":
          setError("No microphone was found on this device.");
          break;
        case "network":
          setError("Speech recognition needs a network connection.");
          break;
        case "aborted":
          // We stopped it ourselves; not worth surfacing.
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");

      const finalText = finalRef.current.trim();
      if (finalText && onResultRef.current) {
        onResultRef.current(finalText);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;

    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (err) {
      // Calling start() twice throws; treat it as already listening.
      console.warn("Could not start recognition:", err.message);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Not running.
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    toggle,
    reset,
  };
}

export default useSpeechRecognition;
