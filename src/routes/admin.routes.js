import express from "express";
import { body } from "express-validator";
import * as adminController from "../controllers/admin.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/users", adminController.getAllUsers);

router.put(
    "/users/:id/role",
    [body("role").isIn(["user", "teacher", "admin"]).withMessage("Invalid role"), validate],
    adminController.updateUserRole,
);

router.patch("/users/:id/toggle-status", adminController.toggleUserStatus);
router.delete("/users/:id", adminController.deleteUser);

router.get("/statistics", adminController.getStatistics);
router.get("/statistics/export", adminController.exportStatistics);

export default router;
