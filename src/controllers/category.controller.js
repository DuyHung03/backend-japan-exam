import QuestionCategory from "../models/question-category.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError } from "../utils/errors.js";

export const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await QuestionCategory.find().sort({ order: 1 });
    ApiResponse.success(res, { categories });
});

export const getCategoryById = asyncHandler(async (req, res) => {
    const { categoryId } = req.body;

    const category = await QuestionCategory.findById(categoryId);

    if (!category) {
        throw new NotFoundError("Category");
    }

    ApiResponse.success(res, { category });
});

export const createCategory = asyncHandler(async (req, res) => {
    const category = await QuestionCategory.create(req.body);
    ApiResponse.created(res, { category }, "Category created successfully");
});

export const updateCategory = asyncHandler(async (req, res) => {
    const { categoryId, ...updateData } = req.body;

    const category = await QuestionCategory.findByIdAndUpdate(categoryId, updateData, {
        new: true,
        runValidators: true,
    });

    if (!category) {
        throw new NotFoundError("Category");
    }

    ApiResponse.success(res, { category }, "Category updated successfully");
});

export const deleteCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.body;

    const category = await QuestionCategory.findById(categoryId);

    if (!category) {
        throw new NotFoundError("Category");
    }

    await category.deleteOne();
    ApiResponse.success(res, null, "Category deleted successfully");
});
