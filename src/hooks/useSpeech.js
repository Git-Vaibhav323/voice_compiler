import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text-to-speech via the Web Speech API (speechSynthesis).
 *
 * Supported in every current desktop and mobile browser, so this half of the
 * voice feature needs no fallback. Only one utterance plays at a time: asking
 * to speak while something is already speaking cancels the previous one.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [voices, setVoices] = useState([]);
  const [rate, setRate] = useState(1);

  const utteranceRef = useRef(null);

  useEffect(() => {
    const available =
      typeof window !== "undefined" && "speechSynthesis" in window;

    setSupported(available);
    if (!available) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  /**
   * Chrome stops speaking after roughly 15 seconds unless the synthesiser is
   * nudged. This keeps long phase narrations alive.
   */
  useEffect(() => {
    if (!speaking || paused) return;

    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [speaking, paused]);

  const pickVoice = useCallback(() => {
    if (!voices.length) return null;

    // Prefer a natural-sounding English voice when one exists.
    const preferred = [
      /Google UK English Female/i,
      /Google US English/i,
      /Microsoft (Aria|Jenny|Guy)/i,
      /Samantha/i,
    ];

    for (const pattern of preferred) {
      const found = voices.find((v) => pattern.test(v.name));
      if (found) return found;
    }

    return voices.find((v) => v.lang?.startsWith("en")) || voices[0];
  }, [voices]);

  const stop = useCallback(() => {
    if (!supported) return;

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setActiveId(null);
  }, [supported]);

  /**
   * Speak `text`. `id` identifies which phase is talking so the UI can show
   * the right button state.
   */
  const speak = useCallback(
    (text, id = null) => {
      if (!supported || !text?.trim()) return;

      // Toggle: pressing the same phase again stops it.
      if (activeId && activeId === id) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();

      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.lang = voice?.lang || "en-US";

      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
        setActiveId(id);
      };

      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        setActiveId(null);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        // "interrupted" just means we cancelled it ourselves.
        if (event.error !== "interrupted" && event.error !== "canceled") {
          console.error("Speech synthesis error:", event.error);
        }
        setSpeaking(false);
        setPaused(false);
        setActiveId(null);
      };

      utteranceRef.current = utterance;

      // Safari occasionally ignores speak() called in the same tick as cancel().
      setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    },
    [supported, activeId, stop, pickVoice, rate]
  );

  const pause = useCallback(() => {
    if (!supported || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  return {
    supported,
    speaking,
    paused,
    activeId,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  };
}

export default useSpeech;
