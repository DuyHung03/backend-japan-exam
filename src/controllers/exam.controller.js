import slugify from "slugify";
import ExamTemplate from "../models/exam-template.model.js";
import Exam from "../models/exam.model.js";
import Question from "../models/question.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError } from "../utils/errors.js";

export const createExam = asyncHandler(async (req, res) => {
    const { title, jlptLevel, sections, ...rest } = req.body;

    const examCode = `${jlptLevel.toUpperCase()}_${slugify(title, { upper: true })}_${Date.now()}`;

    let totalQuestions = 0;
    for (const section of sections) {
        for (const group of section.questionGroups) {
            totalQuestions += group.questionIds.length;

            await Question.updateMany(
                { _id: { $in: group.questionIds } },
                { $inc: { usageCount: 1 } },
            );
        }
    }

    const exam = await Exam.create({
        examCode,
        title,
        jlptLevel,
        sections,
        totalQuestions,
        createdBy: req.user.id,
        ...rest,
    });

    ApiResponse.created(res, { exam }, "Exam created successfully");
});

export const createExamFromTemplate = asyncHandler(async (req, res) => {
    const { templateId, title } = req.body;

    const template = await ExamTemplate.findById(templateId).populate("jlptLevel");

    if (!template || !template.isActive) {
        throw new NotFoundError("Template not found or inactive");
    }

    const sections = [];
    let totalQuestions = 0;

    for (const rule of template.autoGenerationRules) {
        const query = {
            jlptLevel: template.jlptLevel._id,
            status: "approved",
            isPublic: true,
        };

        if (rule.category) query.category = rule.category;
        if (rule.questionType) query.questionType = rule.questionType;
        if (rule.grammarTopics && rule.grammarTopics.length > 0) {
            query.grammarTopic = { $in: rule.grammarTopics };
        }

        let questions = [];

        if (rule.difficulty === "mixed" && rule.difficultyDistribution) {
            const { easy, medium, hard } = rule.difficultyDistribution;

            const easyQuestions = await Question.aggregate([
                { $match: { ...query, difficulty: "easy" } },
                { $sample: { size: easy || 0 } },
            ]);

            const mediumQuestions = await Question.aggregate([
                { $match: { ...query, difficulty: "medium" } },
                { $sample: { size: medium || 0 } },
            ]);

            const hardQuestions = await Question.aggregate([
                { $match: { ...query, difficulty: "hard" } },
                { $sample: { size: hard || 0 } },
            ]);

            questions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
        } else {
            if (rule.difficulty && rule.difficulty !== "mixed") {
                query.difficulty = rule.difficulty;
            }

            questions = await Question.aggregate([
                { $match: query },
                { $sample: { size: rule.count } },
            ]);
        }

        if (questions.length < rule.count) {
            return ApiResponse.error(
                res,
                `Not enough questions for section ${rule.sectionType}. Found ${questions.length}, needed ${rule.count}`,
                400,
            );
        }

        let section = sections.find((s) => s.sectionType === rule.sectionType);
        if (!section) {
            section = {
                sectionType: rule.sectionType,
                sectionName: rule.sectionType,
                duration: 0,
                order: sections.length + 1,
                questionGroups: [],
            };
            sections.push(section);
        }

        section.questionGroups.push({
            category: rule.category,
            questionIds: questions.map((q) => q._id),
            order: section.questionGroups.length + 1,
        });

        totalQuestions += questions.length;

        await Question.updateMany(
            { _id: { $in: questions.map((q) => q._id) } },
            { $inc: { usageCount: 1 } },
        );
    }

    const examCode = `${template.jlptLevel.level}_AUTO_${Date.now()}`;

    const exam = await Exam.create({
        examCode,
        title: title || `${template.name} - ${new Date().toLocaleDateString()}`,
        jlptLevel: template.jlptLevel._id,
        sections,
        totalQuestions,
        duration: template.jlptLevel.duration,
        totalScore: template.jlptLevel.totalScore,
        passingScore: template.jlptLevel.passingScore,
        createdBy: req.user.id,
    });

    ApiResponse.success(res, { exam }, "Exam created from template successfully", 201);
});

export const getExams = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, jlptLevel, status, type, search } = req.query;

    const query = {};

    if (req.user.role === "teacher") {
        query.$or = [{ createdBy: req.user.id }, { isPublic: true }];
    } else if (req.user.role === "admin") {
    } else {
        query.status = "published";
        query.isPublic = true;
    }

    if (jlptLevel) query.jlptLevel = jlptLevel;
    if (status && req.user.role !== "user") query.status = status;
    if (type) query.type = type;
    if (search) {
        query.title = { $regex: search, $options: "i" };
    }

    const total = await Exam.countDocuments(query);
    const exams = await Exam.find(query)
        .populate("jlptLevel", "level name")
        .populate("createdBy", "fullName email")
        .select("-sections")
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, { exams }, page, limit, total);
});

export const getExamById = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id)
        .populate("jlptLevel")
        .populate("createdBy", "fullName email")
        .populate({
            path: "sections.questionGroups.category",
            select: "name code",
        })
        .populate({
            path: "sections.questionGroups.questionIds",
            select: "content options questionType difficulty",
        });

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "user" && (exam.status !== "published" || !exam.isPublic)) {
        return ApiResponse.error(res, "Not authorized to view this exam", 403);
    }

    await Exam.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    ApiResponse.success(res, { exam });
});

export const updateExam = asyncHandler(async (req, res) => {
    let exam = await Exam.findById(req.params.id);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to update this exam", 403);
    }

    exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    ApiResponse.success(res, { exam }, "Exam updated successfully");
});

export const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized to delete this exam", 403);
    }

    if (exam.attemptCount > 0 && req.user.role !== "admin") {
        return ApiResponse.error(res, "Cannot delete exam with attempts", 400);
    }

    await exam.deleteOne();

    ApiResponse.success(res, null, "Exam deleted successfully");
});

export const publishExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        return ApiResponse.error(res, "Exam not found", 404);
    }

    if (req.user.role === "teacher" && exam.createdBy.toString() !== req.user.id) {
        return ApiResponse.error(res, "Not authorized", 403);
    }

    exam.status = "published";
    exam.publishedAt = new Date();
    await exam.save();

    ApiResponse.success(res, { exam }, "Exam published successfully");
});
