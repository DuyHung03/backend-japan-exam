import express from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

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

router.delete("/file", authorize("teacher", "admin"), uploadController.deleteFile);

export default router;
