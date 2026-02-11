import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const createQuestion = asyncHandler(async (req, res) => {
    const questionData = {
        ...req.body,
        createdBy: req.user.id,
    };

    if (req.user.role === "admin") {
        questionData.status = "approved";
        questionData.approvedBy = req.user.id;
        questionData.approvedAt = new Date();
    } else {
        questionData.status = "pending";
    }

    const question = await Question.create(questionData);

    ApiResponse.success(res, { question }, "Question created successfully", 201);
});

export const getQuestions = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        jlptLevel,
        category,
        questionType,
        difficulty,
        status,
        search,
    } = req.query;

    const query = {};

    if (req.user.role === "teacher") {
        query.$or = [{ createdBy: req.user.id }, { status: "approved", isPublic: true }];
    } else if (req.user.role === "admin") {
    } else {
        query.status = "approved";
        query.isPublic = true;
    }

    if (jlptLevel) query.jlptLevel = jlptLevel;
    if (category) query.category = category;
    if (questionType) query.questionType = questionType;
    if (difficulty) query.difficulty = difficulty;
    if (status && req.user.role !== "user") query.status = status;
    if (search) {
        query.$or = [
            { "content.text": { $regex: search, $options: "i" } },
            { explanation: { $regex: search, $options: "i" } },
        ];
    }

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
        .populate("jlptLevel", "level name")
        .populate("category", "name code")
        .populate("grammarTopic", "topicName")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, { questions }, page, limit, total);
});

export const getQuestionById = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id)
        .populate("jlptLevel")
        .populate("category")
        .populate("grammarTopic")
        .populate("createdBy", "fullName email")
        .populate("approvedBy", "fullName email");

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    if (req.user.role === "user" && (question.status !== "approved" || !question.isPublic)) {
        return ApiResponse.error(res, "Not authorized to view this question", 403);
    }

    if (
        req.user.role === "teacher" &&
        question.createdBy._id.toString() !== req.user.id &&
        (question.status !== "approved" || !question.isPublic)
    ) {
        return ApiResponse.error(res, "Not authorized to view this question", 403);
    }

    ApiResponse.success(res, { question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
    let question = await Question.findById(req.params.id);

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    if (req.user.role === "teacher" && question.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to update this question", 403);
    }

    if (question.status === "approved" && req.user.role !== "admin") {
        return ApiResponse.error(res, "Cannot update approved question", 400);
    }

    question = await Question.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    ApiResponse.success(res, { question }, "Question updated successfully");
});

export const deleteQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    if (req.user.role === "teacher" && question.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to delete this question", 403);
    }

    if (question.usageCount > 0 && req.user.role !== "admin") {
        return ApiResponse.error(res, "Cannot delete question that is being used in exams", 400);
    }

    await question.deleteOne();

    ApiResponse.success(res, null, "Question deleted successfully");
});

export const approveQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    question.status = "approved";
    question.approvedBy = req.user.id;
    question.approvedAt = new Date();
    await question.save();

    ApiResponse.success(res, { question }, "Question approved successfully");
});

export const rejectQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
        return ApiResponse.error(res, "Question not found", 404);
    }

    question.status = "rejected";
    await question.save();

    ApiResponse.success(res, { question }, "Question rejected");
});
