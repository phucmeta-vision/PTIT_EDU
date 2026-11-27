// D7 – state bài làm (useReducer), cập nhật immutable
export const initialAttemptState = {
  ready: false,
  total: 0,
  currentIndex: 0,
  answers: {},          // { [questionId]: [optionId] }
  markedQuestions: [],  // [questionId]
};

const clamp = (i, total) => Math.min(Math.max(i, 0), Math.max(total - 1, 0));

export function attemptReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ready: true,
        total: action.total,
        currentIndex: clamp(action.currentIndex || 0, action.total),
        answers: action.answers || {},
        markedQuestions: action.markedQuestions || [],
      };

    case 'SELECT_ANSWER': {
      const { questionId, optionId, qType } = action;
      const cur = state.answers[questionId] || [];
      const next =
        qType === 'single'
          ? [optionId] // single: luôn chỉ 1 đáp án
          : cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
      const answers = { ...state.answers };
      if (next.length) answers[questionId] = next; else delete answers[questionId];
      return { ...state, answers };
    }

    case 'CLEAR_ANSWER': {
      const answers = { ...state.answers };
      delete answers[action.questionId];
      return { ...state, answers };
    }

    case 'TOGGLE_MARK': {
      const has = state.markedQuestions.includes(action.questionId);
      return {
        ...state,
        markedQuestions: has
          ? state.markedQuestions.filter((x) => x !== action.questionId)
          : [...state.markedQuestions, action.questionId],
      };
    }

    case 'GO_TO': return { ...state, currentIndex: clamp(action.index, state.total) };
    case 'NEXT': return { ...state, currentIndex: clamp(state.currentIndex + 1, state.total) };
    case 'PREV': return { ...state, currentIndex: clamp(state.currentIndex - 1, state.total) };
    default: return state;
  }
}
