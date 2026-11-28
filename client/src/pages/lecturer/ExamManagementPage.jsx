import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";
import "./ExamPages.css";

const STATUS_LABELS = {
  draft: "Nháp / Chưa mở",
  open: "Đang mở",
  closed: "Đã đóng",
  published: "Đã phát hành",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function ExamManagementPage() {
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/exams", {
        params: { q: search.trim() || undefined, status: status || undefined, page, limit: 10 },
      });
      setExams(response.data.data || []);
      setPagination(response.data.pagination || { total: 0, totalPages: 1, limit: 10 });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { loadExams(); }, [loadExams]);

  async function handleDelete(exam) {
    const confirmed = window.confirm(`Bạn chắc chắn muốn xóa đề “${exam.title}” (${exam.code})?`);
    if (!confirmed) return;
    try {
      await api.delete(`/exams/${exam._id}`);
      setNotice("Đã xóa đề thi.");
      loadExams();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    loadExams();
  }

  return (
    <main className="exam-shell">
      <header className="exam-topbar">
        <div>
          <div className="eyebrow">PTIT EDU · GIẢNG VIÊN</div>
          <h1>Quản lý đề thi</h1>
          <p className="page-subtitle">Tạo đề, cấu hình ngân hàng câu hỏi và theo dõi kết quả thi.</p>
        </div>
        <Link className="button button-primary" to="/lecturer/exams/new">＋ Tạo đề thi</Link>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel">
        <form className="filter-row" onSubmit={handleSearch}>
          <label className="search-field">
            <span className="sr-only">Tìm đề thi</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên đề hoặc mã đề…" />
          </label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Lọc trạng thái">
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="open">Đang mở</option>
            <option value="closed">Đã đóng</option>
          </select>
          <button className="button button-secondary" type="submit">Tìm kiếm</button>
        </form>

        <div className="table-scroll">
          <table className="exam-table">
            <thead>
              <tr>
                <th>Đề thi</th>
                <th>Mã đề</th>
                <th>Câu hỏi</th>
                <th>Thời gian</th>
                <th>Khung giờ</th>
                <th>Trạng thái</th>
                <th className="actions-heading">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-cell">Đang tải danh sách đề thi…</td></tr>
              ) : exams.length === 0 ? (
                <tr><td colSpan="7" className="empty-cell">Chưa có đề thi phù hợp. Hãy tạo đề thi đầu tiên.</td></tr>
              ) : exams.map((exam) => {
                const currentStatus = exam.displayStatus || exam.status;
                return (
                  <tr key={exam._id}>
                    <td>
                      <strong>{exam.title}</strong>
                      <span className="cell-muted">{String(exam.subjectId || "").slice(-8)}</span>
                    </td>
                    <td><code className="exam-code">{exam.code}</code></td>
                    <td>{exam.questionCount ?? exam.questionIds?.length ?? 0}</td>
                    <td>{exam.duration} phút</td>
                    <td><span>{formatDate(exam.openAt)}</span><span className="cell-muted">đến {formatDate(exam.closeAt)}</span></td>
                    <td><span className={`status-pill status-${currentStatus}`}>{STATUS_LABELS[currentStatus] || currentStatus}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/lecturer/exams/${exam._id}/preview`}>Xem</Link>
                        <Link to={`/lecturer/exams/${exam._id}/edit`}>Sửa</Link>
                        <Link to={`/lecturer/exams/${exam._id}/scores`}>Bảng điểm</Link>
                        <button className="link-danger" type="button" onClick={() => handleDelete(exam)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <span>{pagination.total || 0} đề thi</span>
          <div className="pagination-controls">
            <button className="button button-small button-secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</button>
            <span>Trang {page} / {Math.max(pagination.totalPages || 1, 1)}</span>
            <button className="button button-small button-secondary" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)}>Sau</button>
          </div>
        </footer>
      </section>
    </main>
  );
}
