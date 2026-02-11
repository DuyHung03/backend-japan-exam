import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

export default router;
