import { authService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    ApiResponse.created(res, result, "Registration successful");
});

export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    ApiResponse.success(res, result, "Login successful");
});

export const getMe = asyncHandler(async (req, res) => {
    const result = await authService.getProfile(req.user.id);
    ApiResponse.success(res, result, "User profile fetched");
});

export const updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user.id, req.body);
    ApiResponse.success(res, result, "Profile updated successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body);
    ApiResponse.success(res, null, "Password changed successfully");
});
