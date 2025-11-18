// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import GeminiService from "./GeminiService.js";

dotenv.config();

const app = express();

// Enable CORS for Weebly
app.use(cors());
app.use(express.json());

// Setup file upload memory storage for Whisper
const upload = multer({ storage: multer.memoryStorage() });

// Setup OpenAI client (for Whisper)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ================================
//  Gemini TEXT Endpoint
// ================================
app.post("/predict", async (req, res) => {
  try {
    const userInput = req.body.user_input;

    const answer = await GeminiService.askGemini(userInput);

    res.json({ answer });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// ================================
//  Whisper VOICE Endpoint
// ================================
app.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file received" });

    // 1️⃣ Whisper → Convert audio to text
    const transcription = await openai.audio.transcriptions.create({
      file: req.file.buffer,
      model: "whisper-1"
    });

    const userSpeech = transcription.text;
    console.log("User said:", userSpeech);

    // 2️⃣ Gemini → Analyze text + Recommend product
    const aiResponse = await GeminiService.askGemini(userSpeech);

    // 3️⃣ Return result to Weebly
    res.json({ answer: aiResponse });

  } catch (err) {
    console.error("Voice error:", err);
    res.status(500).json({ error: "Voice processing failed" });
  }
});

// ================================
app.listen(3000, () => {
  console.log("🚀 Backend server running on port 3000");
});

