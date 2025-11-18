import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
    }

    initialize() {
        if (!this.genAI) {
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                throw new Error('GEMINI_API_KEY is missing!');
            }

            this.genAI = new GoogleGenerativeAI(apiKey);

            this.model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash"
            });
        }
    }

    async askGemini(userSentence) {
        this.initialize();

        const prompt = `
You are a mood-based shopping recommender for an online store.

The user entered: "${userSentence}"

1. Detect their mood (example: tired, stressed, sad, happy, energetic, bored).
2. Recommend ONE product the user might want to buy.
3. Keep the recommendation short, simple, and friendly.
4. Respond ONLY in JSON with this structure:

{
  "mood": "...",
  "recommendation": "...",
  "product": "...",
  "reason": "..."
}

NO extra text.
`;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }
}

export default new GeminiService();
