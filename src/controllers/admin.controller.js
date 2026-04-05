import { adminService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getAllUsers = asyncHandler(async (req, res) => {
    const { data, total, page, limit } = await adminService.getAllUsers(req.body);
    ApiResponse.paginate(res, data, page, limit, total, "Users retrieved successfully");
});

export const updateUserRole = asyncHandler(async (req, res) => {
    const user = await adminService.updateUserRole(req.body.userId, req.body.role);
    ApiResponse.success(res, { user }, "User role updated");
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
    const user = await adminService.toggleUserStatus(req.body.userId);
    const action = user.status === "active" ? "unlocked" : "locked";
    ApiResponse.success(res, { user }, `User ${action} successfully`);
});

export const deleteUser = asyncHandler(async (req, res) => {
    await adminService.deleteUser(req.body.userId);
    ApiResponse.success(res, null, "User deleted successfully");
});

export const getStatistics = asyncHandler(async (req, res) => {
    const stats = await adminService.getStatistics();
    ApiResponse.success(res, stats);
});

export const getAttemptChart = asyncHandler(async (req, res) => {
    const { period, count } = req.body;
    const data = await adminService.getAttemptChart({ period, count });
    ApiResponse.success(res, data);
});
