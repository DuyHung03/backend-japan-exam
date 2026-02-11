import express from "express";
import { body } from "express-validator";
import * as examTemplateController from "../controllers/exam-template.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher", "admin"));

router.post(
    "/",
    [
        body("name").notEmpty().withMessage("Template name is required"),
        body("jlptLevel").notEmpty().withMessage("JLPT level is required"),
        body("autoGenerationRules").isArray({ min: 1 }).withMessage("At least 1 rule is required"),
        validate,
    ],
    examTemplateController.createTemplate,
);

router.get("/", examTemplateController.getAllTemplates);
router.get("/:id", examTemplateController.getTemplateById);
router.put("/:id", examTemplateController.updateTemplate);
router.delete("/:id", examTemplateController.deleteTemplate);

export default router;
