import ExamTemplate from "../models/exam-template.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getAllTemplates = asyncHandler(async (req, res) => {
    const { jlptLevel, isActive } = req.query;

    const query = {};
    if (jlptLevel) query.jlptLevel = jlptLevel;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const templates = await ExamTemplate.find(query)
        .populate("jlptLevel", "level name")
        .populate("autoGenerationRules.category", "name code")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 });

    ApiResponse.success(res, { templates });
});

export const getTemplateById = asyncHandler(async (req, res) => {
    const template = await ExamTemplate.findById(req.params.id)
        .populate("jlptLevel")
        .populate("autoGenerationRules.category")
        .populate("autoGenerationRules.grammarTopics")
        .populate("createdBy", "fullName email");

    if (!template) {
        return ApiResponse.error(res, "Template not found", 404);
    }

    ApiResponse.success(res, { template });
});

export const createTemplate = asyncHandler(async (req, res) => {
    const template = await ExamTemplate.create({
        ...req.body,
        createdBy: req.user.id,
    });

    ApiResponse.success(res, { template }, "Template created successfully", 201);
});

export const updateTemplate = asyncHandler(async (req, res) => {
    const template = await ExamTemplate.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!template) {
        return ApiResponse.error(res, "Template not found", 404);
    }

    ApiResponse.success(res, { template }, "Template updated successfully");
});

export const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await ExamTemplate.findById(req.params.id);

    if (!template) {
        return ApiResponse.error(res, "Template not found", 404);
    }

    await template.deleteOne();
    ApiResponse.success(res, null, "Template deleted successfully");
});
