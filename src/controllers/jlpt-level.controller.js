import JlptLevel from "../models/jlpt-level.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError } from "../utils/errors.js";

export const getAllLevels = asyncHandler(async (req, res) => {
    const levels = await JlptLevel.find().sort({ order: 1 });
    ApiResponse.success(res, { levels });
});

export const getLevelById = asyncHandler(async (req, res) => {
    const level = await JlptLevel.findById(req.params.id);

    if (!level) {
        throw new NotFoundError("Level");
    }

    ApiResponse.success(res, { level });
});

export const createLevel = asyncHandler(async (req, res) => {
    const level = await JlptLevel.create(req.body);
    ApiResponse.created(res, { level }, "Level created successfully");
});

export const updateLevel = asyncHandler(async (req, res) => {
    const level = await JlptLevel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!level) {
        throw new NotFoundError("Level");
    }

    ApiResponse.success(res, { level }, "Level updated successfully");
});

export const deleteLevel = asyncHandler(async (req, res) => {
    const level = await JlptLevel.findById(req.params.id);

    if (!level) {
        throw new NotFoundError("Level");
    }

    await level.deleteOne();
    ApiResponse.success(res, null, "Level deleted successfully");
});
