import express from "express";
import { body } from "express-validator";
import * as bookmarkController from "../controllers/bookmark.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();
router.use(protect);

router.post(
    "/toggle",
    [
        body("examId").notEmpty().withMessage("Exam ID is required"),
        body("questionId").notEmpty().withMessage("Question ID is required"),
        validate,
    ],
    bookmarkController.toggleBookmark,
);

router.post("/my-bookmarks", bookmarkController.getMyBookmarks);
router.post("/check", bookmarkController.checkBookmarks);

export default router;