const router = require('express').Router();
const { requireAuth } = require('../middleware/examAuth');
const { requireStudent } = require('../middleware/studentAuth');
const c = require('../controllers/attemptController');

router.use(requireAuth, requireStudent);

router.get('/available-exams', c.getAvailableExams); // D2
router.post('/start', c.startAttempt);               // D4
router.get('/mine', c.getMyAttempts);                // D13 lịch sử
router.get('/:id', c.getAttemptState);               // D11
router.get('/:id/questions', c.getAttemptQuestions); // D5
router.put('/:id/progress', c.saveProgress);         // D11 autosave
router.post('/:id/submit', c.submitAttempt);         // D12
router.get('/:id/result', c.getAttemptResult);       // D13

module.exports = router;
