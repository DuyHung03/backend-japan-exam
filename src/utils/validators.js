import { validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map((err) => ({
                field: err.path || err.param,
                message: err.msg,
            })),
        });
    }

    next();
};

export const validateRequest = (validations) => {
    return async (req, res, next) => {
        for (const validation of validations) {
            await validation.run(req);
        }
        handleValidationErrors(req, res, next);
    };
};
