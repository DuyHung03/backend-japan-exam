import express from "express";
import * as jlptLevelController from "../controllers/jlpt-level.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", jlptLevelController.getAllLevels);
router.get("/:id", jlptLevelController.getLevelById);

router.use(protect);
router.use(authorize("admin"));

router.post("/", jlptLevelController.createLevel);
router.put("/:id", jlptLevelController.updateLevel);
router.delete("/:id", jlptLevelController.deleteLevel);

export default router;
