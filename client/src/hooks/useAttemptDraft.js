// D9 – lưu nháp localStorage theo attemptId (các lần thi không ghi đè nhau)
import { useCallback, useEffect } from 'react';

export default function useAttemptDraft(attemptId, { answers, markedQuestions, currentIndex }, enabled = true) {
  const key = `attempt_draft_${attemptId}`;

  const load = useCallback(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }, [key]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  // Debounce 300ms để không ghi liên tục
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ answers, markedQuestions, currentIndex, savedAt: Date.now() }));
      } catch { /* localStorage đầy/bị chặn: bỏ qua, server vẫn autosave */ }
    }, 300);
    return () => clearTimeout(t);
  }, [key, enabled, answers, markedQuestions, currentIndex]);

  return { load, clear };
}