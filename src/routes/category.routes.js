import express from "express";
import * as categoryController from "../controllers/category.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

router.use(protect);
router.use(authorize("admin"));

router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;
