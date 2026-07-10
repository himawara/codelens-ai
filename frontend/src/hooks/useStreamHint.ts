import { useState, useRef, useCallback } from "react";
import { streamHint, HintLevel } from "../api/client";

interface UseStreamHintReturn {
  hint: string;
  streaming: boolean;
  error: string | null;
  requestHint: (sessionId: string, level: HintLevel, code: string) => void;
  clearHint: () => void;
}

export function useStreamHint(): UseStreamHintReturn {
  const [hint, setHint] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const requestHint = useCallback((sessionId: string, level: HintLevel, code: string) => {
    // Cancel any in-flight stream
    if (cancelRef.current) cancelRef.current();

    setHint("");
    setError(null);
    setStreaming(true);

    const cancel = streamHint(
      sessionId,
      level,
      code,
      (token) => setHint((prev) => prev + token),
      () => setStreaming(false),
      (err) => {
        setError(err);
        setStreaming(false);
      }
    );

    cancelRef.current = cancel;
  }, []);

  const clearHint = useCallback(() => {
    if (cancelRef.current) cancelRef.current();
    setHint("");
    setError(null);
    setStreaming(false);
  }, []);

  return { hint, streaming, error, requestHint, clearHint };
}
