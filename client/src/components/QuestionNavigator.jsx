// D8 – bảng điều hướng câu hỏi
import React from 'react';

export default function QuestionNavigator({ questions, answers, markedQuestions, currentIndex, onGo }) {
  const answered = questions.filter((q) => (answers[q._id] || []).length > 0).length;
  return (
    <aside className="qnav" aria-label="Bảng câu hỏi">
      <p className="qnav__sum">Đã làm <b>{answered}</b>/{questions.length}</p>
      <div className="qnav__grid">
        {questions.map((q, i) => {
          const done = (answers[q._id] || []).length > 0;
          const marked = markedQuestions.includes(q._id);
          const cls = ['qnav__item', done && 'is-done', marked && 'is-marked', i === currentIndex && 'is-current']
            .filter(Boolean).join(' ');
          return (
            <button key={q._id} type="button" className={cls} onClick={() => onGo(i)}
              aria-label={`Câu ${i + 1}${done ? ', đã làm' : ''}${marked ? ', đánh dấu' : ''}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <ul className="qnav__legend">
        <li><i className="is-done" /> Đã làm</li>
        <li><i /> Chưa làm</li>
        <li><i className="is-marked" /> Xem lại</li>
      </ul>
    </aside>
  );
}
