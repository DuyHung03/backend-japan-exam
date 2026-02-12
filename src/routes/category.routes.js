import express from "express";
import { body } from "express-validator";
import * as categoryController from "../controllers/category.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.post("/list", categoryController.getAllCategories);

router.post(
    "/get-by-id",
    [body("categoryId").optional(), body("categoryCode").optional()],
    categoryController.getCategoryById,
);

router.use(protect);
router.use(authorize("admin"));

router.post("/create", categoryController.createCategory);

router.post(
    "/update",
    [body("categoryId").notEmpty().withMessage("Category ID is required"), validate],
    categoryController.updateCategory,
);

router.post(
    "/delete",
    [body("categoryId").notEmpty().withMessage("Category ID is required"), validate],
    categoryController.deleteCategory,
);

export default router;
