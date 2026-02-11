import ExamAttempt from "../models/exam-attempt.model.js";
import Exam from "../models/exam.model.js";
import Question from "../models/question.model.js";
import User from "../models/user.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    ApiResponse.paginate(res, { users }, page, limit, total);
});

export const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
        throw new NotFoundError("User");
    }

    ApiResponse.success(res, { user }, "User role updated");
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new NotFoundError("User");
    }

    user.status = user.status === "active" ? "locked" : "active";
    await user.save();

    ApiResponse.success(
        res,
        { user },
        `User ${user.status === "active" ? "unlocked" : "locked"} successfully`,
    );
});

export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new NotFoundError("User");
    }

    if (user.role === "admin") {
        throw new ValidationError("Cannot delete admin user");
    }

    await user.deleteOne();

    ApiResponse.success(res, null, "User deleted successfully");
});

export const getStatistics = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalExams = await Exam.countDocuments();
    const totalAttempts = await ExamAttempt.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const approvedQuestions = await Question.countDocuments({ status: "approved" });
    const pendingQuestions = await Question.countDocuments({ status: "pending" });

    const attemptsByLevel = await ExamAttempt.aggregate([
        {
            $lookup: {
                from: "exams",
                localField: "exam",
                foreignField: "_id",
                as: "examData",
            },
        },
        { $unwind: "$examData" },
        {
            $lookup: {
                from: "jlptlevels",
                localField: "examData.jlptLevel",
                foreignField: "_id",
                as: "levelData",
            },
        },
        { $unwind: "$levelData" },
        {
            $group: {
                _id: "$levelData.level",
                count: { $sum: 1 },
                avgScore: { $avg: "$results.totalScore" },
            },
        },
    ]);

    const recentAttempts = await ExamAttempt.find({ status: "submitted" })
        .populate("user", "fullName email")
        .populate("exam", "title examCode")
        .select("user exam results.totalScore results.passed startTime")
        .sort({ startTime: -1 })
        .limit(10);

    ApiResponse.success(res, {
        users: {
            total: totalUsers,
            teachers: totalTeachers,
        },
        exams: {
            total: totalExams,
        },
        questions: {
            total: totalQuestions,
            approved: approvedQuestions,
            pending: pendingQuestions,
        },
        attempts: {
            total: totalAttempts,
            byLevel: attemptsByLevel,
        },
        recentAttempts,
    });
});

export const exportStatistics = asyncHandler(async (req, res) => {
    const statistics = await getStatistics(req, res);

    ApiResponse.success(res, statistics, "Statistics exported");
});
