import Logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    Logger.error("Error Handler", err, {
        path: req.path,
        method: req.method,
    });

    if (err.name === "CastError") {
        const message = "Resource not found";
        error = { statusCode: 404, message };
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field} already exists`;
        error = { statusCode: 400, message };
    }

    if (err.name === "ValidationError") {
        const message = Object.values(err.errors)
            .map((val) => val.message)
            .join(", ");
        error = { statusCode: 400, message };
    }

    if (err.name === "JsonWebTokenError") {
        const message = "Invalid token";
        error = { statusCode: 401, message };
    }

    if (err.name === "TokenExpiredError") {
        const message = "Token expired";
        error = { statusCode: 401, message };
    }

    res.status(error.statusCode || err.statusCode || 500).json({
        success: false,
        error: error.message || "Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

export default errorHandler;
