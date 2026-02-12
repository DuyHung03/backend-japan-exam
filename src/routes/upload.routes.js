import express from "express";
import { body } from "express-validator";
import * as uploadController from "../controllers/upload.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

router.post(
    "/image",
    authorize("teacher", "admin"),
    upload.single("image"),
    uploadController.uploadImage,
);

router.post(
    "/images",
    authorize("teacher", "admin"),
    upload.array("images", 10),
    uploadController.uploadMultipleImages,
);

router.post(
    "/audio",
    authorize("teacher", "admin"),
    upload.single("audio"),
    uploadController.uploadAudio,
);

router.post("/avatar", upload.single("avatar"), uploadController.uploadAvatar);

router.post(
    "/delete-file",
    authorize("teacher", "admin"),
    [body("filePath").notEmpty().withMessage("File path is required"), validate],
    uploadController.deleteFile,
);

export default router;
