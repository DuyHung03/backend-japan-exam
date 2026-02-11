import express from "express";
import * as publicController from "../controllers/public.controller.js";

const router = express.Router();

router.get("/system-info", publicController.getSystemInfo);
router.get("/jlpt-levels", publicController.getJlptLevels);
router.get("/jlpt-levels/:level", publicController.getJlptLevelInfo);
router.get("/categories", publicController.getCategories);
router.get("/demo-exams", publicController.getDemoExams);
router.get("/demo-exams/:id", publicController.getDemoExamDetail);

export default router;
