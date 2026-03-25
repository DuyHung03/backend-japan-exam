import express from "express";
import { body } from "express-validator";
import * as feedbackController from "../controllers/exam-feedback.controller.js";
import { authorize, optionalAuth, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

// ── Public / guest-friendly (optionalAuth) ──

// List feedbacks for an exam
router.post(
    "/list",
    optionalAuth,
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    feedbackController.list,
);

// List replies for a parent feedback
router.post("/replies", optionalAuth, feedbackController.listReplies);

// Get average rating
router.post(
    "/rating",
    [body("examId").notEmpty().withMessage("Exam ID is required"), validate],
    feedbackController.getRating,
);

// Create feedback (guest can also comment / report)
router.post(
    "/create",
    optionalAuth,
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("type")
            .isIn(["comment", "report", "feedback"])
            .withMessage("Type must be comment, report, or feedback"),
        body("content").notEmpty().withMessage("Content is required").isLength({ max: 2000 }),
        validate,
    ],
    feedbackController.create,
);

// ── Authenticated ──

// Delete own feedback
router.post(
    "/delete",
    protect,
    [body("feedbackId").notEmpty().withMessage("Feedback ID is required"), validate],
    feedbackController.remove,
);

// Admin: update status
router.post(
    "/update-status",
    protect,
    authorize("admin"),
    [
        body("feedbackId").notEmpty().withMessage("Feedback ID is required"),
        body("status").isIn(["visible", "hidden", "resolved"]).withMessage("Invalid status"),
        validate,
    ],
    feedbackController.updateStatus,
);

export default router;
