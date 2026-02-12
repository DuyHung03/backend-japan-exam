import express from "express";
import { body } from "express-validator";
import * as examAttemptController from "../controllers/exam-attempt.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/start",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.startExam,
);

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

router.post(
    "/submit",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.submitExam,
);

router.post("/my-attempts", examAttemptController.getMyAttempts);

router.post(
    "/get-by-id",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.getAttemptById,
);

router.post(
    "/ai-analysis",
    [body("attemptId").notEmpty().withMessage("Attempt ID is required"), validate],
    examAttemptController.generateAIAnalysis,
);

export default router;
