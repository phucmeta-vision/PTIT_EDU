// D3 – nhập mã đề & xác nhận tham gia (dùng GET /api/exams/code/:code của TV3)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptApi } from '../../services/attemptApi';
import './StudentExam.css';

const fmt = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function EnterExamCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (e) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return setError('Vui lòng nhập mã đề.');
    setLoading(true); setError(''); setExam(null);
    try {
      setExam(await attemptApi.examByCode(value));
    } catch (err) {
      setError(err.status === 404 ? 'Mã đề không tồn tại.' : err.message);
    } finally { setLoading(false); }
  };

  const start = async () => {
    setLoading(true); setError('');
    try {
      const a = await attemptApi.start(exam._id);
      navigate(`/student/attempts/${a._id}`);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <section className="page page--narrow">
      <h1>Nhập mã đề</h1>
      <form onSubmit={check} className="card">
        <label htmlFor="examCode">Mã đề thi</label>
        <input id="examCode" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="VD: ABC123" autoComplete="off" disabled={loading} />
        <button className="btn" type="submit" disabled={loading}>
          {loading && !exam ? 'Đang kiểm tra…' : 'Kiểm tra mã'}
        </button>
      </form>
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {exam && (
        <div className="card">
          <h2>{exam.title}</h2>
          <ul className="meta">
            <li>Thời lượng: <b>{exam.duration} phút</b></li>
            <li>Số lần thi tối đa: <b>{exam.maxAttempts}</b></li>
            <li>Mở: {fmt(exam.openAt)} – Đóng: {fmt(exam.closeAt)}</li>
          </ul>
          {exam.canStart ? (
            <>
              <p className="muted">Đồng hồ chạy ngay khi bạn bấm “Bắt đầu làm bài”.</p>
              <button className="btn" onClick={start} disabled={loading}>
                {loading ? 'Đang bắt đầu…' : 'Bắt đầu làm bài'}
              </button>
            </>
          ) : (
            <p className="alert alert--error">Đề thi hiện không trong thời gian làm bài.</p>
          )}
        </div>
      )}
    </section>
  );
}
