import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { File } from "node:buffer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

/* =======================
      GEMINI SETUP
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

/* =======================
      OPENAI (WHISPER) SETUP
========================= */
const openai = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY
});

/* =======================
      /predict (TEXT INPUT)
========================= */
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
    console.error("❌ Text error:", error);
    res.status(500).json({ answer: "Error processing text" });
  }
});

/* =======================
      /voice (AUDIO INPUT)
========================= */
import fetch from "node-fetch";

app.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ answer: "No audio received" });
    }

    console.log("🎤 Received audio:", req.file.mimetype);

    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), "audio.webm");
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const userText = await whisperRes.text();

    console.log("📝 Whisper text:", userText);

    // Gemini step
    const prompt = `
      You are a mood-based shopping assistant.
      User said: "${userText}"

      Respond ONLY in JSON:
      {
        "mood": "...",
        "product": "...",
        "reason": "..."
      }
    `;

    const result = await geminiModel.generateContent(prompt);

    res.json({ answer: result.response.text() });

  } catch (error) {
    console.error("❌ Voice error:", error);
    res.status(500).json({ answer: "Error processing voice input" });
  }
});


/* =======================
      START SERVER
========================= */
app.listen(3000, () =>
  console.log("🚀 Server running on http://localhost:3000")
);
