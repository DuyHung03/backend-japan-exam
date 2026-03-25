import {
    examAttemptRepository,
    examRepository,
    questionBlockRepository,
    questionRepository,
    userRepository,
} from "../repositories/index.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

class AdminService {
    async getAllUsers(filters) {
        return userRepository.searchUsers(filters);
    }

    async updateUserRole(userId, role) {
        const user = await userRepository.updateById(userId, { role });
        if (!user) throw new NotFoundError("User");
        return user;
    }

    async toggleUserStatus(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError("User");

        user.status = user.status === "active" ? "locked" : "active";
        await user.save();
        return user;
    }

    async deleteUser(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError("User");
        if (user.role === "admin") {
            throw new BadRequestError("Cannot delete admin user");
        }

        await userRepository.deleteById(userId);
    }

    async getStatistics() {
        const [
            totalUsers,
            totalCreators,
            totalExams,
            totalAttempts,
            totalQuestions,
            totalBlocks,
            blocksBySection,
            examsByLevel,
            recentAttempts,
        ] = await Promise.all([
            userRepository.count(),
            userRepository.count({ role: "creator" }),
            examRepository.count(),
            examAttemptRepository.count(),
            questionRepository.count(),
            questionBlockRepository.count(),
            questionBlockRepository.countBySection(),
            examRepository.countByLevel(),
            examAttemptRepository.getRecentSubmitted(10),
        ]);

        return {
            users: { total: totalUsers, creators: totalCreators },
            exams: { total: totalExams, byLevel: examsByLevel },
            questions: { total: totalQuestions, blocks: totalBlocks, bySection: blocksBySection },
            attempts: { total: totalAttempts },
            recentAttempts,
        };
    }
}

export default new AdminService();
