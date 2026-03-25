import express from "express";
import { body } from "express-validator";
import * as examController from "../controllers/exam.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

// Tạo bài thi (copy câu hỏi từ bank)
router.post(
    "/create",
    authorize("teacher", "admin"),
    [
        body("title").notEmpty().withMessage("Title is required"),
        body("level")
            .isIn(["N5", "N4", "N3", "N2", "N1"])
            .withMessage("Level must be N5, N4, N3, N2, or N1"),
        body("sections").isArray({ min: 1 }).withMessage("At least 1 section is required"),
        body("duration").isNumeric().withMessage("Duration is required"),
        validate,
    ],
    examController.createExam,
);

// Danh sách bài thi (authenticated)
router.post("/list", examController.getExams);

// Chi tiết bài thi
router.post(
    "/get-by-id",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.getExamById,
);

// Cập nhật bài thi
router.post(
    "/update",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.updateExam,
);

// Thêm block vào exam section
router.post(
    "/add-block",
    authorize("teacher", "admin"),
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("sectionIndex").isNumeric().withMessage("Section index is required"),
        body("block").isObject().withMessage("Block data is required"),
        validate,
    ],
    examController.addBlockToExam,
);

// Xóa block khỏi exam
router.post(
    "/remove-block",
    authorize("teacher", "admin"),
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("sectionIndex").isNumeric().withMessage("Section index is required"),
        body("blockIndex").isNumeric().withMessage("Block index is required"),
        validate,
    ],
    examController.removeBlockFromExam,
);

// Cập nhật câu hỏi embedded trong exam
router.post(
    "/update-question",
    authorize("teacher", "admin"),
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("sectionIndex").isNumeric().withMessage("Section index is required"),
        body("blockIndex").isNumeric().withMessage("Block index is required"),
        body("questionIndex").isNumeric().withMessage("Question index is required"),
        body("questionData").isObject().withMessage("Question data is required"),
        validate,
    ],
    examController.updateExamQuestion,
);

// Xóa câu hỏi embedded trong exam
router.post(
    "/remove-question",
    authorize("teacher", "admin"),
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("sectionIndex").isNumeric().withMessage("Section index is required"),
        body("blockIndex").isNumeric().withMessage("Block index is required"),
        body("questionIndex").isNumeric().withMessage("Question index is required"),
        validate,
    ],
    examController.removeQuestionFromExam,
);

// Xóa bài thi
router.post(
    "/delete",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.deleteExam,
);

// Publish bài thi
router.post(
    "/publish",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.publishExam,
);

export default router;
