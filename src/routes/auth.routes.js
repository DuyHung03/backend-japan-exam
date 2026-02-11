import express from "express";
import { body } from "express-validator";
import * as authController from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.post(
    "/register",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
        body("fullName").notEmpty().withMessage("Full name is required"),
        validate,
    ],
    authController.register,
);

router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required"),
        validate,
    ],
    authController.login,
);

router.get("/me", protect, authController.getMe);

router.put(
    "/profile",
    protect,
    [body("fullName").optional().notEmpty().withMessage("Full name cannot be empty"), validate],
    authController.updateProfile,
);

router.put(
    "/change-password",
    protect,
    [
        body("currentPassword").notEmpty().withMessage("Current password is required"),
        body("newPassword")
            .isLength({ min: 6 })
            .withMessage("New password must be at least 6 characters"),
        validate,
    ],
    authController.changePassword,
);

export default router;
