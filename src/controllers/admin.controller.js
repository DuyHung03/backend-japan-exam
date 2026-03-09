import ExamAttempt from "../models/exam-attempt.model.js";
import Exam from "../models/exam.model.js";
import QuestionBlock from "../models/question-block.model.js";
import Question from "../models/question.model.js";
import User from "../models/user.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

/**
 * Danh sách users (admin only)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status, search } = req.body;

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

    ApiResponse.paginate(res, users, page, limit, total, "Users retrieved successfully");
});

export const updateUserRole = asyncHandler(async (req, res) => {
    const { userId, role } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
        throw new NotFoundError("User");
    }

    ApiResponse.success(res, { user }, "User role updated");
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    const user = await User.findById(userId);

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
    const { userId } = req.body;

    const user = await User.findById(userId);

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
    const [totalUsers, totalTeachers, totalExams, totalAttempts, totalQuestions, totalGroups] =
        await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "teacher" }),
            Exam.countDocuments(),
            ExamAttempt.countDocuments(),
            Question.countDocuments(),
            QuestionBlock.countDocuments(),
        ]);

    // Thống kê block theo section
    const blocksBySection = await QuestionBlock.aggregate([
        { $group: { _id: "$section", count: { $sum: 1 } } },
    ]);

    // Thống kê bài thi theo level
    const examsByLevel = await Exam.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]);

    // Lần thi gần nhất
    const recentAttempts = await ExamAttempt.find({ status: "submitted" })
        .populate("user", "fullName email")
        .populate("exam", "title examCode level")
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
            byLevel: examsByLevel,
        },
        questions: {
            total: totalQuestions,
            blocks: totalGroups,
            bySection: blocksBySection,
        },
        attempts: {
            total: totalAttempts,
        },
        recentAttempts,
    });
});
