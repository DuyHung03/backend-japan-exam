import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";

/**
 * Require valid JWT token. Sets req.user.
 */
export const protect = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        throw new AuthenticationError("Not authorized to access this route");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            throw new AuthenticationError("User not found");
        }

        if (req.user.status === "locked") {
            throw new AuthorizationError("Account is locked");
        }

        next();
    } catch (error) {
        if (error.statusCode) throw error;
        throw new AuthenticationError("Not authorized, token failed");
    }
});

/**
 * Optional auth — sets req.user if valid token exists, otherwise continues.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            if (user && user.status === "active") {
                req.user = user;
            }
        } catch {
            // Invalid token — continue as guest
        }
    }

    next();
});

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AuthorizationError(
                `User role '${req.user.role}' is not authorized to access this route`,
            );
        }
        next();
    };
};

function extractToken(req) {
    if (req.headers.authorization?.startsWith("Bearer")) {
        return req.headers.authorization.split(" ")[1];
    }
    return null;
}
