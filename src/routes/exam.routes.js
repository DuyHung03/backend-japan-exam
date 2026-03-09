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

// Danh sách bài thi
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

// Lấy bài thi mẫu
router.get("/sample", examController.getSampleExam);

export default router;
