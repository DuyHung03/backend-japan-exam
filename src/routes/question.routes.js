import express from "express";
import { body } from "express-validator";
import * as questionController from "../controllers/question.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

// Thêm câu hỏi vào block đã tồn tại
router.post(
    "/add-to-block",
    authorize("teacher", "admin"),
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
    authorize("teacher", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.updateQuestion,
);

// Xóa câu hỏi
router.post(
    "/delete",
    authorize("teacher", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.deleteQuestion,
);

export default router;
