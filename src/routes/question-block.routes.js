import express from "express";
import { body } from "express-validator";
import * as blockController from "../controllers/question-block.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.use(protect);

/**
 * POST /question-blocks/create
 * Unified — tạo N blocks (standalone + group) trong 1 call.
 *
 * Body: { items: [ { section, level, questions: [...], context?: {...} } ] }
 */
router.post(
    "/create",
    authorize("teacher", "admin"),
    [
        body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
        body("items.*.section")
            .isIn(["vocabulary", "grammar", "reading", "listening"])
            .withMessage("section must be vocabulary, grammar, reading, or listening"),
        body("items.*.level")
            .isIn(["N5", "N4", "N3", "N2", "N1"])
            .withMessage("level must be N5, N4, N3, N2, or N1"),
        body("items.*.questions")
            .isArray({ min: 1 })
            .withMessage("Each item must have at least 1 question"),
        validate,
    ],
    blockController.createBlocks,
);

// Danh sách blocks
router.post("/list", blockController.getBlocks);

// Chi tiết block (kèm câu hỏi)
router.post(
    "/get-by-id",
    [body("blockId").notEmpty().withMessage("Block ID is required"), validate],
    blockController.getBlockById,
);

// Cập nhật block metadata
router.post(
    "/update",
    authorize("teacher", "admin"),
    [body("blockId").notEmpty().withMessage("Block ID is required"), validate],
    blockController.updateBlock,
);

// Xóa block + tất cả câu hỏi
router.post(
    "/delete",
    authorize("teacher", "admin"),
    [body("blockId").notEmpty().withMessage("Block ID is required"), validate],
    blockController.deleteBlock,
);

export default router;
