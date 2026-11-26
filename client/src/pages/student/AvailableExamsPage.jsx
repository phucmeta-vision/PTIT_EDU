// D2 – danh sách kỳ thi đang mở (trạng thái & lượt thi còn lại do server tính)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptApi } from '../../services/attemptApi';
import './StudentExam.css';

const fmt = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function AvailableExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    let alive = true;
    attemptApi.availableExams()
      .then((e) => alive && setExams(e))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const start = async (exam) => {
    setStartingId(exam._id); setError('');
    try {
      const a = await attemptApi.start(exam._id); // server kiểm tra giờ + số lượt
      navigate(`/student/attempts/${a._id}`);
    } catch (e) { setError(e.message); setStartingId(null); }
  };

  if (loading) return <p className="state-msg">Đang tải kỳ thi…</p>;

  return (
    <section className="page">
      <h1>Kỳ thi đang mở</h1>
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {!exams.length && !error && <p className="state-msg">Hiện chưa có kỳ thi nào đang mở.</p>}
      <div className="exam-grid">
        {exams.map((exam) => {
          const resume = exam.inProgressAttemptId;
          const blocked = !resume && exam.attemptsRemaining === 0;
          return (
            <article key={exam._id} className="card">
              <h2>{exam.title}</h2>
              <p className="muted">{exam.subjectId?.name || 'Môn học'} · Mã: {exam.code}</p>
              <ul className="meta">
                <li>Thời lượng: <b>{exam.duration} phút</b></li>
                <li>Lượt thi còn lại: <b>{exam.attemptsRemaining}</b>/{exam.maxAttempts}</li>
                <li>Đóng lúc: {fmt(exam.closeAt)}</li>
              </ul>
              <span className={`badge ${resume ? 'badge--warn' : blocked ? 'badge--off' : 'badge--ok'}`}>
                {resume ? 'Đang làm dở' : blocked ? 'Hết lượt thi' : 'Đang mở'}
              </span>
              <button className="btn" disabled={blocked || startingId === exam._id}
                onClick={() => (resume ? navigate(`/student/attempts/${resume}`) : start(exam))}>
                {startingId === exam._id ? 'Đang bắt đầu…' : resume ? 'Tiếp tục làm bài' : 'Vào thi'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
