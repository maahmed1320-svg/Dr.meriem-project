import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// === GEMINI SETUP ===
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// === WHISPER SETUP ===
const openai = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY
});

// === /predict (TEXT) ===
app.post("/predict", async (req, res) => {
  try {
    const userInput = req.body.user_input;

    const prompt = `
      You are a mood-based shopping recommender.

      User said: "${userInput}"

      Respond ONLY in JSON:
      {
        "mood": "...",
        "product": "...",
        "reason": "..."
      }
    `;

    const result = await geminiModel.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });

  } catch (error) {
    console.error("Text error:", error);
    res.status(500).json({ answer: "Error processing text" });
  }
});


// === /voice (AUDIO) ===
app.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ answer: "No audio received" });
    }

    // Convert Buffer → File object for OpenAI Whisper
    const fileData = new File(
      [req.file.buffer],
      "voice.webm",
      { type: "audio/webm" }
    );

    // Step 1 — Transcribe with Whisper
    const transcript = await openai.audio.transcriptions.create({
      file: fileData,
      model: "gpt-4o-mini-tts", // Whisper replacement
      response_format: "text"
    });

    const userText = transcript;

    // Step 2 — Send extracted text to Gemini
    const prompt = `
      You are a mood-based shopping recommender.

      User said: "${userText}"

      Respond ONLY in JSON:
      {
        "mood": "...",
        "product": "...",
        "reason": "..."
      }
    `;

    const result = await geminiModel.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });

  } catch (error) {
    console.error("Voice error:", error);
    res.status(500).json({ answer: "Error processing voice input" });
  }
});


app.listen(3000, () => console.log("🚀 Server running on port 3000"));
