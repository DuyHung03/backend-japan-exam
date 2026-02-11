export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = "ValidationError";
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "Not authenticated") {
        super(message, 401);
        this.name = "AuthenticationError";
    }
}

export class AuthorizationError extends AppError {
    constructor(message = "Not authorized") {
        super(message, 403);
        this.name = "AuthorizationError";
    }
}

export class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends AppError {
    constructor(message = "Resource already exists") {
        super(message, 409);
        this.name = "ConflictError";
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad request") {
        super(message, 400);
        this.name = "BadRequestError";
    }
}
