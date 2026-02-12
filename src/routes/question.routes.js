import express from "express";
import { body } from "express-validator";
import * as questionController from "../controllers/question.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/create",
    authorize("teacher", "admin"),
    [
        body("jlptLevel").notEmpty().withMessage("JLPT level is required"),
        body("category").notEmpty().withMessage("Category is required"),
        body("questionType").notEmpty().withMessage("Question type is required"),
        body("content.text").notEmpty().withMessage("Question text is required"),
        body("options").isArray({ min: 2 }).withMessage("At least 2 options are required"),
        body("correctAnswer").notEmpty().withMessage("Correct answer is required"),
        validate,
    ],
    questionController.createQuestion,
);

router.post("/list", questionController.getQuestions);

router.post(
    "/get-by-id",
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.getQuestionById,
);

router.post(
    "/update",
    authorize("teacher", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.updateQuestion,
);

router.post(
    "/delete",
    authorize("teacher", "admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.deleteQuestion,
);

router.post(
    "/approve",
    authorize("admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.approveQuestion,
);

router.post(
    "/reject",
    authorize("admin"),
    [body("questionId").notEmpty().withMessage("Question ID is required"), validate],
    questionController.rejectQuestion,
);

export default router;
