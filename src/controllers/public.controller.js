import Exam from "../models/exam.model.js";
import JlptLevel from "../models/jlpt-level.model.js";
import QuestionCategory from "../models/question-category.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getSystemInfo = asyncHandler(async (req, res) => {
    ApiResponse.success(res, {
        name: "JLPT Online Test System",
        version: "1.0.0",
        description: "Japanese Language Proficiency Test preparation platform",
    });
});

export const getJlptLevels = asyncHandler(async (req, res) => {
    const levels = await JlptLevel.find({ isActive: true }).sort({ order: 1 }).select("-structure");

    ApiResponse.success(res, { levels });
});

export const getJlptLevelInfo = asyncHandler(async (req, res) => {
    const { levelId, levelCode } = req.body;

    let level;
    if (levelId) {
        level = await JlptLevel.findById(levelId);
    } else if (levelCode) {
        level = await JlptLevel.findOne({
            level: levelCode.toUpperCase(),
            isActive: true,
        });
    }

    if (!level) {
        return ApiResponse.error(res, "Level not found", 404);
    }

    ApiResponse.success(res, { level });
});

export const getDemoExams = asyncHandler(async (req, res) => {
    const exams = await Exam.find({
        isDemoExam: true,
        isPublic: true,
        status: "published",
    })
        .populate("jlptLevel", "level name")
        .select("-sections")
        .sort({ createdAt: -1 })
        .limit(10);

    ApiResponse.success(res, { exams });
});

export const getDemoExamDetail = asyncHandler(async (req, res) => {
    const { examId, examCode } = req.body;

    let exam;
    if (examId) {
        exam = await Exam.findById(examId);
    } else if (examCode) {
        exam = await Exam.findOne({ examCode });
    }

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (!exam.isDemoExam || !exam.isPublic || exam.status !== "published") {
        return ApiResponse.error(res, "This is not a demo exam", 403);
    }

    exam = await Exam.findByIdAndUpdate(exam._id, { $inc: { viewCount: 1 } }, { new: true })
        .populate("jlptLevel")
        .populate({
            path: "sections.questionGroups.category",
            select: "name code",
        })
        .populate({
            path: "sections.questionGroups.questionIds",
            select: "content options questionType difficulty",
        });

    ApiResponse.success(res, { exam });
});

export const getCategories = asyncHandler(async (req, res) => {
    const categories = await QuestionCategory.find().sort({ order: 1 });
    ApiResponse.success(res, { categories });
});

export const getGrammarTopics = asyncHandler(async (req, res) => {
    const exams = await Exam.find({
        isFeatured: true,
        isPublic: true,
        status: "published",
    })
        .populate("jlptLevel", "level name")
        .select("-sections")
        .sort({ createdAt: -1 })
        .limit(5);

    ApiResponse.success(res, { exams });
});
