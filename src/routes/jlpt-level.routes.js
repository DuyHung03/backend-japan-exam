import express from "express";
import { body } from "express-validator";
import * as jlptLevelController from "../controllers/jlpt-level.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.post("/list", jlptLevelController.getAllLevels);

router.post(
    "/get-by-id",
    [body("levelId").optional(), body("levelCode").optional()],
    jlptLevelController.getLevelById,
);

router.use(protect);
router.use(authorize("admin"));

router.post("/create", jlptLevelController.createLevel);

router.post(
    "/update",
    [body("levelId").notEmpty().withMessage("Level ID is required"), validate],
    jlptLevelController.updateLevel,
);

router.post(
    "/delete",
    [body("levelId").notEmpty().withMessage("Level ID is required"), validate],
    jlptLevelController.deleteLevel,
);

export default router;
