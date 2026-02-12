import express from "express";
import { body } from "express-validator";
import * as examController from "../controllers/exam.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/create",
    authorize("teacher", "admin"),
    [
        body("title").notEmpty().withMessage("Title is required"),
        body("jlptLevel").notEmpty().withMessage("JLPT level is required"),
        body("sections").isArray({ min: 1 }).withMessage("At least 1 section is required"),
        validate,
    ],
    examController.createExam,
);

router.post(
    "/from-template",
    authorize("teacher", "admin"),
    [body("templateId").notEmpty().withMessage("Template ID is required"), validate],
    examController.createExamFromTemplate,
);

router.post("/list", examController.getExams);

router.post(
    "/get-by-id",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.getExamById,
);

router.post(
    "/update",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.updateExam,
);

router.post(
    "/delete",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.deleteExam,
);

router.post(
    "/publish",
    authorize("teacher", "admin"),
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    examController.publishExam,
);

export default router;
