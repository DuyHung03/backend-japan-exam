import express from "express";
import * as grammarTopicController from "../controllers/grammar-topic.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", grammarTopicController.getAllTopics);
router.get("/:id", grammarTopicController.getTopicById);

router.use(protect);
router.use(authorize("teacher", "admin"));

router.post("/", grammarTopicController.createTopic);
router.put("/:id", grammarTopicController.updateTopic);
router.delete("/:id", grammarTopicController.deleteTopic);

export default router;
