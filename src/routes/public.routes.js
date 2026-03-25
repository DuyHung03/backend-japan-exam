import express from "express";
import { body } from "express-validator";
import * as examAttemptController from "../controllers/exam-attempt.controller.js";
import * as examController from "../controllers/exam.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

// Public exam listing (no auth required)
router.post("/exams", examController.getPublicExams);

// Public exam info (optionalAuth for stats)
router.post(
    "/exam-info",
    optionalAuth,
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.getExamInfo,
);

// Public practice evaluation (no auth required, no DB persistence)
router.post(
    "/evaluate-practice",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examAttemptController.evaluatePractice,
);

export default router;
