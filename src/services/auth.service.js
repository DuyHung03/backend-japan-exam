import { userRepository } from "../repositories/index.js";
import { AuthenticationError, BadRequestError, ConflictError } from "../utils/errors.js";

class AuthService {
    async register({ email, password, fullName, phoneNumber, dateOfBirth }) {
        const existing = await userRepository.findByEmail(email);
        if (existing) {
            throw new ConflictError("Email already registered");
        }

        const user = await userRepository.create({
            email,
            password,
            fullName,
            phoneNumber,
            dateOfBirth,
        });

        const token = user.generateAuthToken();
        return { user: this._formatUser(user), token };
    }

    async login({ email, password }) {
        const user = await userRepository.findByEmailWithPassword(email);

        if (!user) {
            throw new AuthenticationError("Invalid credentials");
        }
        if (user.status === "locked") {
            throw new AuthenticationError("Account is locked");
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            throw new AuthenticationError("Invalid credentials");
        }

        const token = user.generateAuthToken();
        return { user: this._formatUser(user), token };
    }

    async getProfile(userId) {
        const user = await userRepository.findById(userId);
        return { user };
    }

    async updateProfile(userId, { fullName, phoneNumber, dateOfBirth }) {
        const user = await userRepository.updateById(userId, {
            fullName,
            phoneNumber,
            dateOfBirth,
        });
        return { user };
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await userRepository.findByIdWithPassword(userId);

        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
            throw new BadRequestError("Current password is incorrect");
        }

        user.password = newPassword;
        await user.save();
    }

    _formatUser(user) {
        return {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            avatar: user.avatar,
            phoneNumber: user.phoneNumber,
            dateOfBirth: user.dateOfBirth,
            createdAt: user.createdAt,
        };
    }
}

export default new AuthService();
