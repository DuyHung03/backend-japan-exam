import { getGeminiModel } from "../config/gemini.js";
import Logger from "../utils/logger.js";

class AiService {
    /**
     * Tạo giải thích cho câu hỏi JLPT bằng Gemini AI.
     *
     * @param {Object} params
     * @param {string} params.questionText - Nội dung câu hỏi
     * @param {Array<{label: string, text: string}>} params.options - Các đáp án
     * @param {string} params.correctAnswer - Label đáp án đúng (A/B/C/D)
     * @param {string} [params.level] - JLPT level (N5-N1)
     * @param {string} [params.sectionType] - vocabulary/grammar/reading/listening
     * @param {string} [params.context] - Context of reading/listening passage
     * @returns {Promise<{explanation: string, translationVi: string}>}
     */
    async generateExplanation({
        questionText,
        options,
        correctAnswer,
        level,
        sectionType,
        context,
    }) {
        const model = getGeminiModel();
        if (!model) {
            throw new Error("Gemini AI is not configured. Please set GEMINI_API_KEY.");
        }

        const optionsText = (options || []).map((o) => `${o.label}. ${o.text}`).join("\n");

        const correctOption = (options || []).find((o) => o.label === correctAnswer);
        const correctText = correctOption
            ? `${correctOption.label}. ${correctOption.text}`
            : correctAnswer;

        const levelInfo = level ? `Cấp độ: JLPT ${level}` : "";
        const sectionInfo = sectionType ? `Phần thi: ${sectionType}` : "";
        const contextInfo = context ? `\nNgữ cảnh/Đoạn văn:\n${context}` : "";

        const prompt = `Bạn là chuyên gia tiếng Nhật chuyên nghiệp. Hãy giải thích câu hỏi JLPT sau đây bằng tiếng Việt.

${levelInfo}
${sectionInfo}
${contextInfo}

Câu hỏi: ${questionText}

Các đáp án:
${optionsText}

Đáp án đúng: ${correctText}

Hãy trả về JSON với format chính xác sau (KHÔNG markdown, KHÔNG code block):
{
  "explanation": "Giải thích chi tiết tại sao đáp án đúng là đúng, và tại sao các đáp án khác sai. Nếu có ngữ pháp hoặc từ vựng quan trọng, hãy giải thích thêm. Viết bằng tiếng Việt, có thể kèm tiếng Nhật khi cần.",
  "translationVi": "Dịch nghĩa câu hỏi sang tiếng Việt (bao gồm cả đoạn văn nếu có)"
}`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Parse JSON từ response
            const parsed = this._parseJsonResponse(text);
            return {
                explanation: parsed.explanation || "",
                translationVi: parsed.translationVi || "",
            };
        } catch (error) {
            Logger.error(`Gemini AI error: ${error.message}`);
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    /**
     * Parse JSON từ Gemini response (có thể có markdown code block wrapper).
     */
    _parseJsonResponse(text) {
        // Xóa markdown code block nếu có
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        try {
            return JSON.parse(cleaned);
        } catch {
            // Fallback: trả về text gốc làm explanation
            Logger.warn("Failed to parse Gemini JSON response, using raw text");
            return {
                explanation: text.trim(),
                translationVi: "",
            };
        }
    }
}

export default new AiService();
