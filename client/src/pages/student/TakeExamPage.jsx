// D6 phòng thi · D11 khôi phục sau reload · D13 tự nộp khi hết giờ
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { attemptApi } from '../../services/attemptApi';
import { attemptReducer, initialAttemptState } from '../../state/attemptReducer';
import useAttemptDraft from '../../hooks/useAttemptDraft';
import useServerCountdown from '../../hooks/useServerCountdown';
import QuestionNavigator from '../../components/QuestionNavigator';
import './StudentExam.css';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function TakeExamPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(attemptReducer, initialAttemptState);
  const [meta, setMeta] = useState(null);       // { exam, expiresAt, serverNow }
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveText, setSaveText] = useState('');

  const stateRef = useRef(state);
  stateRef.current = state;
  const submittedRef = useRef(false);
  const resultPath = `/student/attempts/${attemptId}/result`;

  const { load: loadDraft, clear: clearDraft } = useAttemptDraft(attemptId, state, state.ready);

  // ----- D11: tải attempt, ưu tiên bản mới hơn giữa localStorage và server -----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await attemptApi.getAttempt(attemptId);
        if (a.status !== 'in-progress') { clearDraft(); navigate(resultPath, { replace: true }); return; }
        const { questions: qs } = await attemptApi.getQuestions(attemptId);
        if (!alive) return;

        const draft = loadDraft();
        const serverTs = a.progressUpdatedAt ? new Date(a.progressUpdatedAt).getTime() : 0;
        const src = draft && draft.savedAt > serverTs
          ? draft
          : { answers: a.answers, markedQuestions: a.markedQuestions, currentIndex: draft?.currentIndex || 0 };

        const valid = new Set(qs.map((q) => q._id));
        const answers = Object.fromEntries(Object.entries(src.answers || {}).filter(([k]) => valid.has(k)));
        dispatch({
          type: 'INIT', total: qs.length, answers,
          markedQuestions: (src.markedQuestions || []).filter((x) => valid.has(x)),
          currentIndex: src.currentIndex,
        });
        setQuestions(qs);
        setMeta({ exam: a.exam, expiresAt: a.expiresAt, serverNow: a.serverNow });
      } catch (e) { if (alive) setError(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // ----- autosave lên server (debounce 2s) -----
  useEffect(() => {
    if (!state.ready || submittedRef.current) return undefined;
    const t = setTimeout(async () => {
      try {
        setSaveText('Đang lưu…');
        await attemptApi.saveProgress(attemptId, { answers: state.answers, markedQuestions: state.markedQuestions });
        setSaveText('Đã lưu');
      } catch { setSaveText('Chưa lưu được (đã lưu tạm trên máy)'); }
    }, 2000);
    return () => clearTimeout(t);
  }, [attemptId, state.ready, state.answers, state.markedQuestions]);

  // ----- D13: nộp bài, retry an toàn (server idempotent) -----
  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true; setSubmitting(true); setError('');
    for (let i = 0; i < 5; i += 1) {
      try {
        await attemptApi.submit(attemptId, {
          answers: stateRef.current.answers, markedQuestions: stateRef.current.markedQuestions,
        });
        clearDraft();
        navigate(resultPath, { replace: true });
        return;
      } catch (e) {
        const retryable = !e.status || e.status >= 500 || e.status === 408 || e.status === 429;
        if (!retryable) { if (e.status === 404) break; setError(e.message); break; }
        await sleep(1000 * 2 ** i);
      }
    }
    submittedRef.current = false; setSubmitting(false);
    setError((p) => p || 'Chưa nộp được do lỗi mạng. Bài làm đã được lưu, hãy bấm “Nộp bài” lại.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // ----- D10: đồng hồ theo server, hết giờ tự nộp -----
  const { formatted, isLow } = useServerCountdown({
    expiresAt: meta?.expiresAt, serverNow: meta?.serverNow, onExpire: submit,
  });

  const confirmSubmit = () => {
    const left = questions.length - questions.filter((q) => (state.answers[q._id] || []).length).length;
    const msg = left ? `Bạn còn ${left} câu chưa làm. Vẫn nộp bài?` : 'Nộp bài ngay bây giờ?';
    if (window.confirm(msg)) submit();
  };

  if (loading) return <p className="state-msg">Đang tải bài thi…</p>;
  if (!meta) return <p className="alert alert--error" role="alert">{error || 'Không tải được bài thi'}</p>;

  const q = questions[state.currentIndex];
  const selected = state.answers[q._id] || [];
  const marked = state.markedQuestions.includes(q._id);

  return (
    <div className="exam-room">
      <header className="exam-room__bar">
        <div>
          <strong>{meta.exam?.title}</strong>
          <span className="muted"> · Câu {state.currentIndex + 1}/{state.total}</span>
        </div>
        <div className={`timer ${isLow ? 'timer--low' : ''}`} role="timer" aria-live="off">⏱ {formatted}</div>
      </header>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((state.currentIndex + 1) / state.total) * 100}%` }} />
      </div>

      {error && <p className="alert alert--error" role="alert">{error}</p>}

      <main className="exam-room__main">
        <section className="card question">
          <p className="question__type">{q.type === 'single' ? 'Chọn 1 đáp án' : 'Chọn nhiều đáp án'}</p>
          <h2 className="question__content">{q.content}</h2>
          <div className="options" role={q.type === 'single' ? 'radiogroup' : 'group'}>
            {q.options.map((o) => (
              <label key={o.id} className={`option ${selected.includes(o.id) ? 'is-selected' : ''}`}>
                <input type={q.type === 'single' ? 'radio' : 'checkbox'} name={`q-${q._id}`}
                  checked={selected.includes(o.id)}
                  onChange={() => dispatch({ type: 'SELECT_ANSWER', questionId: q._id, optionId: o.id, qType: q.type })} />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
          <div className="question__tools">
            <button type="button" className={`btn btn--ghost ${marked ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_MARK', questionId: q._id })}>
              {marked ? '★ Bỏ đánh dấu' : '☆ Đánh dấu xem lại'}
            </button>
            {selected.length > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'CLEAR_ANSWER', questionId: q._id })}>Xóa lựa chọn</button>
            )}
          </div>
          <div className="question__nav">
            <button className="btn btn--ghost" disabled={state.currentIndex === 0} onClick={() => dispatch({ type: 'PREV' })}>← Câu trước</button>
            <button className="btn btn--ghost" disabled={state.currentIndex === state.total - 1} onClick={() => dispatch({ type: 'NEXT' })}>Câu sau →</button>
          </div>
        </section>

        <div>
          <QuestionNavigator questions={questions} answers={state.answers} markedQuestions={state.markedQuestions}
            currentIndex={state.currentIndex} onGo={(i) => dispatch({ type: 'GO_TO', index: i })} />
          <p className="muted save-text">{saveText}</p>
          <button className="btn btn--block" onClick={confirmSubmit} disabled={submitting}>
            {submitting ? 'Đang nộp bài…' : 'Nộp bài'}
          </button>
        </div>
      </main>
    </div>
  );
}
