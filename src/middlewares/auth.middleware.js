import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";

export const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

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
        throw new AuthenticationError("Not authorized, token failed");
    }
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
