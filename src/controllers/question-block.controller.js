import { questionBlockService } from "../services/index.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const createBlocks = asyncHandler(async (req, res) => {
    const result = await questionBlockService.createBlocks(req.body.items, req.user.id);
    ApiResponse.created(res, result, "Question blocks created successfully");
});

export const getBlocks = asyncHandler(async (req, res) => {
    const { data, total, page, limit } = await questionBlockService.getBlocks(req.body);
    ApiResponse.paginate(res, data, page, limit, total, "Question blocks retrieved successfully");
});

export const getBlockById = asyncHandler(async (req, res) => {
    const block = await questionBlockService.getBlockById(req.body.blockId);
    ApiResponse.success(res, { block });
});

export const updateBlock = asyncHandler(async (req, res) => {
    const { blockId, ...updateData } = req.body;
    const block = await questionBlockService.updateBlock(blockId, updateData, req.user);
    ApiResponse.success(res, { block }, "Question block updated successfully");
});

export const updateFullBlock = asyncHandler(async (req, res) => {
    const { blockId, questions, ...blockData } = req.body;
    const block = await questionBlockService.updateFullBlock(
        blockId,
        blockData,
        questions,
        req.user,
    );
    ApiResponse.success(res, { block }, "Block and questions updated successfully");
});

export const deleteBlock = asyncHandler(async (req, res) => {
    await questionBlockService.deleteBlock(req.body.blockId, req.user);
    ApiResponse.success(res, null, "Question block and its questions deleted successfully");
});
