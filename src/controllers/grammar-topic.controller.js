import GrammarTopic from "../models/grammar-topic.model.js";
import ApiResponse from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { NotFoundError } from "../utils/errors.js";

export const getAllTopics = asyncHandler(async (req, res) => {
    const { jlptLevel } = req.body;

    const query = {};
    if (jlptLevel) query.jlptLevel = jlptLevel;

    const topics = await GrammarTopic.find(query)
        .populate("jlptLevel", "level name")
        .sort({ order: 1 });

    ApiResponse.success(res, { topics });
});

export const getTopicById = asyncHandler(async (req, res) => {
    const { topicId } = req.body;

    const topic = await GrammarTopic.findById(topicId).populate("jlptLevel");

    if (!topic) {
        return ApiResponse.error(res, "Topic not found", 404);
    }

    ApiResponse.success(res, { topic });
});

export const createTopic = asyncHandler(async (req, res) => {
    const topic = await GrammarTopic.create(req.body);
    ApiResponse.created(res, { topic }, "Topic created successfully");
});

export const updateTopic = asyncHandler(async (req, res) => {
    const { topicId, ...updateData } = req.body;

    const topic = await GrammarTopic.findByIdAndUpdate(topicId, updateData, {
        new: true,
        runValidators: true,
    });

    if (!topic) {
        throw new NotFoundError("Topic");
    }

    ApiResponse.success(res, { topic }, "Topic updated successfully");
});

export const deleteTopic = asyncHandler(async (req, res) => {
    const { topicId } = req.body;

    const topic = await GrammarTopic.findById(topicId);

    if (!topic) {
        throw new NotFoundError("Topic");
    }

    await topic.deleteOne();

    ApiResponse.success(res, null, "Topic deleted successfully");
});
