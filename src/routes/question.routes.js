import express from "express";
import { body } from "express-validator";
import * as aiController from "../controllers/ai.controller.js";
import * as questionController from "../controllers/question.controller.js";
import { authorize, optionalAuth, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

// ── AI Explanation (cần auth, mọi role đều dùng được) ──

// Teacher/Admin: tạo giải thích khi soạn câu hỏi
router.post(
    "/ai-explain",
    protect,
    authorize("creator", "admin"),
    [body("questionText").notEmpty().withMessage("questionText is required"), validate],
    aiController.aiExplainQuestion,
);

// Student: yêu cầu giải thích cho câu hỏi trong đề thi (lưu vào DB)
router.post(
    "/ai-explain-exam-question",
    optionalAuth,
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("questionId").notEmpty().withMessage("Question ID is required"),
        validate,
    ],
    aiController.aiExplainExamQuestion,
);

// ── Protected routes (teacher/admin) ──
router.use(protect);

// Thêm câu hỏi vào block đã tồn tại
router.post(
    "/add-to-block",
    authorize("creator", "admin"),
    [
        body("blockId").notEmpty().withMessage("Block ID is required"),
        body("questions").isArray({ min: 1 }).withMessage("questions must be a non-empty array"),
        validate,
    ],
    questionController.addQuestionsToBlock,
);

// Chi tiết câu hỏi
router.post(
    "/get-by-id",
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.getQuestionById,
);

// Cập nhật câu hỏi
router.post(
    "/update",
    authorize("creator", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.updateQuestion,
);

// Xóa câu hỏi
router.post(
    "/delete",
    authorize("creator", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.deleteQuestion,
);

export default router;
