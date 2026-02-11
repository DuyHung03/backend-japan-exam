import express from "express";
import { body } from "express-validator";
import * as questionController from "../controllers/question.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/",
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

router.get("/", questionController.getQuestions);
router.get("/:id", questionController.getQuestionById);

router.put("/:id", authorize("teacher", "admin"), questionController.updateQuestion);

router.delete("/:id", authorize("teacher", "admin"), questionController.deleteQuestion);

router.patch("/:id/approve", authorize("admin"), questionController.approveQuestion);

router.patch("/:id/reject", authorize("admin"), questionController.rejectQuestion);

export default router;
