import express from "express";
import * as gamificationController from "../controllers/gamification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);

// Achievements
router.post("/achievements", gamificationController.getAchievements);
router.post("/achievements/check", gamificationController.checkNewAchievements);

// Study Goals
router.post("/study-goal", gamificationController.getStudyGoal);
router.post("/study-goal/update", gamificationController.updateStudyGoal);

export default router;