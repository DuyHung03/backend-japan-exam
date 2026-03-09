import express from "express";
import { body } from "express-validator";
import * as adminController from "../controllers/admin.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

// Quản lý users
router.post("/users", adminController.getAllUsers);

router.post(
    "/users/update-role",
    [
        body("userId").notEmpty().withMessage("User ID is required"),
        body("role").isIn(["user", "teacher", "admin"]).withMessage("Invalid role"),
        validate,
    ],
    adminController.updateUserRole,
);

router.post(
    "/users/toggle-status",
    [body("userId").notEmpty().withMessage("User ID is required"), validate],
    adminController.toggleUserStatus,
);

router.post(
    "/users/delete",
    [body("userId").notEmpty().withMessage("User ID is required"), validate],
    adminController.deleteUser,
);

// Thống kê
router.post("/statistics", adminController.getStatistics);

export default router;
