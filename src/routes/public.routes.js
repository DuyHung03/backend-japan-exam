import express from "express";
import { body } from "express-validator";
import * as publicController from "../controllers/public.controller.js";

const router = express.Router();

router.post("/system-info", publicController.getSystemInfo);
router.post("/jlpt-levels", publicController.getJlptLevels);

router.post(
    "/jlpt-level-info",
    [body("levelId").optional(), body("levelCode").optional()],
    publicController.getJlptLevelInfo,
);

router.post("/categories", publicController.getCategories);
router.post("/demo-exams", publicController.getDemoExams);

router.post(
    "/demo-exam-detail",
    [body("examId").optional(), body("examCode").optional()],
    publicController.getDemoExamDetail,
);

export default router;
