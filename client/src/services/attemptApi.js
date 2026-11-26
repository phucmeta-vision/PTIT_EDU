// API module thi – dùng axios instance chung của dự án (services/api.js: baseURL + token)
import api, { getApiErrorMessage } from './api';

// Server trả { success, data } -> chỉ lấy data; lỗi -> Error có .status và message tiếng Việt
async function call(request) {
  try {
    const body = (await request).data;
    return body && typeof body === 'object' && 'data' in body ? body.data : body;
  } catch (e) {
    const err = new Error(getApiErrorMessage(e));
    err.status = e.response?.status;
    throw err;
  }
}

export const attemptApi = {
  availableExams: () => call(api.get('/attempts/available-exams')),     // D2
  examByCode: (code) => call(api.get(`/exams/code/${encodeURIComponent(code)}`)), // D3 (TV3)
  start: (examId) => call(api.post('/attempts/start', { examId })),     // D4
  getAttempt: (id) => call(api.get(`/attempts/${id}`)),                 // D11
  getQuestions: (id) => call(api.get(`/attempts/${id}/questions`)),     // D5
  saveProgress: (id, body) => call(api.put(`/attempts/${id}/progress`, body)),
  submit: (id, body) => call(api.post(`/attempts/${id}/submit`, body)), // D12
  result: (id) => call(api.get(`/attempts/${id}/result`)),              // D13
  mine: async () => (await call(api.get('/attempts/mine'))).attempts,   // D13
};
