import { userRepository } from "../repositories/index.js";
import { uploadService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { BadRequestError } from "../utils/errors.js";

export const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");
    const result = await uploadService.uploadImage(req.file.buffer, "jlpt/images");
    ApiResponse.success(
        res,
        { url: result.url, publicId: result.publicId },
        "Image uploaded successfully",
    );
});

export const uploadMultipleImages = asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new BadRequestError("No files uploaded");
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
    if (!req.file) throw new BadRequestError("No file uploaded");
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
    if (!req.body.publicId) throw new BadRequestError("Public ID is required");
    await uploadService.deleteFile(req.body.publicId);
    ApiResponse.success(res, null, "File deleted successfully");
});

export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");
    const result = await uploadService.uploadImage(req.file.buffer, "jlpt/avatars");
    await userRepository.updateById(req.user.id, { avatar: result.url });
    ApiResponse.success(
        res,
        { url: result.url, publicId: result.publicId },
        "Avatar uploaded successfully",
    );
});
