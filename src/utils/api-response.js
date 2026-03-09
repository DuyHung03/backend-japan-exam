export default class ApiResponse {
    static success(res, data, message = "Success", statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static error(res, message = "Error", statusCode = 500, errors = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(errors && { errors }),
        });
    }

    static paginate(res, data, page, limit, total, message = "Success") {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        return res.status(200).json({
            success: true,
            message,
            data: Array.isArray(data) ? data : data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNext: pageNum * limitNum < total,
                hasPrev: pageNum > 1,
            },
        });
    }

    static created(res, data, message = "Created successfully") {
        return ApiResponse.success(res, data, message, 201);
    }

    static noContent(res) {
        return res.status(204).send();
    }
}
