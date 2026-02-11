import express from "express";
import { body } from "express-validator";
import * as examController from "../controllers/exam.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/",
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

router.get("/", examController.getExams);
router.get("/:id", examController.getExamById);

router.put("/:id", authorize("teacher", "admin"), examController.updateExam);

router.delete("/:id", authorize("teacher", "admin"), examController.deleteExam);

router.patch("/:id/publish", authorize("teacher", "admin"), examController.publishExam);

export default router;
