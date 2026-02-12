import express from "express";
import { body } from "express-validator";
import * as grammarTopicController from "../controllers/grammar-topic.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

router.post("/list", grammarTopicController.getAllTopics);

router.post("/get-by-id", [body("topicId").optional()], grammarTopicController.getTopicById);

router.use(protect);
router.use(authorize("teacher", "admin"));

router.post("/create", grammarTopicController.createTopic);

router.post(
    "/update",
    [body("topicId").notEmpty().withMessage("Topic ID is required"), validate],
    grammarTopicController.updateTopic,
);

router.post(
    "/delete",
    [body("topicId").notEmpty().withMessage("Topic ID is required"), validate],
    grammarTopicController.deleteTopic,
);

export default router;
