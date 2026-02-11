import User from "../models/user.model.js";
import uploadService from "../services/upload.service.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ValidationError } from "../utils/errors.js";

export const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ValidationError("No file uploaded");
    }

    const result = await uploadService.uploadImage(req.file.buffer, "jlpt/images");

    ApiResponse.success(
        res,
        {
            url: result.url,
            publicId: result.publicId,
        },
        "Image uploaded successfully",
    );
});

export const uploadMultipleImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new ValidationError("No files uploaded");
    }

    const results = await uploadService.uploadMultipleImages(req.files, "jlpt/images");

    ApiResponse.success(
        res,
        {
            images: results.map((r) => ({ url: r.url, publicId: r.publicId })),
        },
        "Images uploaded successfully",
    );
});

export const uploadAudio = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ValidationError("No file uploaded");
    }

    const result = await uploadService.uploadAudio(req.file.buffer, "jlpt/audio");

    ApiResponse.success(
        res,
        {
            url: result.url,
            publicId: result.publicId,
            duration: result.duration,
        },
        "Audio uploaded successfully",
    );
});

export const deleteFile = asyncHandler(async (req, res) => {
    const { publicId } = req.body;

    if (!publicId) {
        throw new ValidationError("Public ID is required");
    }

    await uploadService.deleteFile(publicId);

    ApiResponse.success(res, null, "File deleted successfully");
});

export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ValidationError("No file uploaded");
    }

    const result = await uploadService.uploadImage(req.file.buffer, "jlpt/avatars");

    await User.findByIdAndUpdate(req.user.id, { avatar: result.url });

    ApiResponse.success(
        res,
        {
            url: result.url,
            publicId: result.publicId,
        },
        "Avatar uploaded successfully",
    );
});
