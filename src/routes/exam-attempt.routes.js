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
    "/:attemptId/submit-answer",
    [
        body("questionId").notEmpty().withMessage("Question ID is required"),
        body("selectedAnswer").notEmpty().withMessage("Selected answer is required"),
        validate,
    ],
    examAttemptController.submitAnswer,
);

router.post("/:attemptId/submit", examAttemptController.submitExam);

router.get("/my-attempts", examAttemptController.getMyAttempts);
router.get("/:id", examAttemptController.getAttemptById);

router.post("/:id/ai-analysis", examAttemptController.generateAIAnalysis);

export default router;
