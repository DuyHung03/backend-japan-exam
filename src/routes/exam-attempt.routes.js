import express from "express";
import { body } from "express-validator";
import * as examAttemptController from "../controllers/exam-attempt.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

// Bắt đầu làm bài thi
router.post(
    "/start",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.startExam,
);

// Nộp câu trả lời
router.post(
    "/submit-answer",
    [
        body("attemptId").notEmpty().withMessage("Attempt ID is required"),
        body("questionId").notEmpty().withMessage("Question ID is required"),
        body("selectedAnswer").notEmpty().withMessage("Selected answer is required"),
        validate,
    ],
    examAttemptController.submitAnswer,
);

// Nộp bài thi
router.post(
    "/submit",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.submitExam,
);

// Lịch sử làm bài
router.post("/my-attempts", examAttemptController.getMyAttempts);

// Chi tiết lần làm bài
router.post(
    "/get-by-id",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.getAttemptById,
);

export default router;
