import User from "../models/user.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AuthenticationError, BadRequestError, ConflictError } from "../utils/errors.js";

export const register = asyncHandler(async (req, res) => {
    const { email, password, fullName, phoneNumber, dateOfBirth } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ConflictError("Email already registered");
    }

    const user = await User.create({
        email,
        password,
        fullName,
        phoneNumber,
        dateOfBirth,
    });

    const token = user.generateAuthToken();

    ApiResponse.success(
        res,
        {
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatar: user.avatar,
            },
            token,
        },
        "Registration successful",
        201,
    );
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        throw new AuthenticationError("Invalid credentials");
    }

    if (user.status === "locked") {
        throw new AuthenticationError("Account is locked");
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new AuthenticationError("Invalid credentials");
    }

    const token = user.generateAuthToken();

    ApiResponse.success(
        res,
        {
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatar: user.avatar,
            },
            token,
        },
        "Login successful",
    );
});

export const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    ApiResponse.success(res, { user }, "User profile fetched");
});

export const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, phoneNumber, dateOfBirth } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { fullName, phoneNumber, dateOfBirth },
        { new: true, runValidators: true },
    );

    ApiResponse.success(res, { user }, "Profile updated successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
        throw new BadRequestError("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    ApiResponse.success(res, null, "Password changed successfully");
});
