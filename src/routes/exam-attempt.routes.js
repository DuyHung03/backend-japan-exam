import express from "express";
import { body } from "express-validator";
import * as examAttemptController from "../controllers/exam-attempt.controller.js";
import { optionalAuth, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

// ── Public / guest-friendly routes (optionalAuth) ──

// Bắt đầu làm bài thi (guest → no DB persist)
router.post(
    "/start",
    optionalAuth,
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.startExam,
);

// Nộp bài thi (guest → evaluate in-memory)
router.post("/submit", optionalAuth, [validate], examAttemptController.submitExam);

// Chấm điểm luyện tập (không lưu DB)
router.post(
    "/evaluate-practice",
    optionalAuth,
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.evaluatePractice,
);

// Lấy thông tin exam cho student (không kèm câu hỏi)
router.post(
    "/exam-info",
    optionalAuth,
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.getExamInfo,
);

// Lấy kết quả bài thi đã nộp (kèm chi tiết từng câu)
router.post(
    "/result",
    optionalAuth,
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.getAttemptResult,
);

// ── Authenticated-only routes ──
router.use(protect);

// Lịch sử làm bài
router.post("/my-attempts", examAttemptController.getMyAttempts);

// Thống kê profile user
router.post("/profile-stats", examAttemptController.getProfileStats);

// Chi tiết lần làm bài
router.post(
    "/get-by-id",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.getAttemptById,
);

// Câu sai từ các lần thi gần đây
router.post("/wrong-questions", examAttemptController.getWrongQuestions);

// Leaderboard
router.post("/leaderboard", examAttemptController.getLeaderboard);

// Gợi ý bài thi
router.post("/recommendations", examAttemptController.getRecommendations);

export default router;
