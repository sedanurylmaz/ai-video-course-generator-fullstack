import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Storage } from "@google-cloud/storage";
import Replicate from "replicate";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";

import { chapterContentSlides } from "@/config/schema";
import { db } from "@/config/db";
import { GENERATE_VIDEO_CONTENT_PROMPT } from "@/data/prompt";

/* ================= TYPES ================= */

type Slide = {
  slideId: string;
  slideIndex: number;
  title: string;
  subtitle: string;
  audioFileName: string;
  narration: { fullText: string };
  html: string;
  revealData: string[];
};

/* ================= SETUP ================= */

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

const sleep = (ms: number) =>
  new Promise(res => setTimeout(res, ms));

/* ================= HELPERS ================= */

function chunkText(text: string, size = 180) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function saveAudio(buffer: Buffer, fileName: string) {
  const file = bucket.file(`${fileName}.mp3`);
  await file.save(buffer, {
    contentType: "audio/mpeg",
    resumable: false,
  });
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

async function generateCaptions(audioUrl: string) {
  return replicate.run(
    "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
    { input: { audio: audioUrl, batch_size: 64 } }
  );
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  const { chapter, courseId } = await req.json();

  /* ---------- GUARD: chapter zaten üretilmiş mi? ---------- */
  const existing = await db
    .select()
    .from(chapterContentSlides)
    .where(eq(chapterContentSlides.chapterId, chapter.chapterId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: "Chapter already generated",
    });
  }

  /* ---------- AI SLIDE GENERATION ---------- */
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
${GENERATE_VIDEO_CONTENT_PROMPT}

INPUT:
{
  "courseName": "${chapter.courseName ?? ""}",
  "chapterTitle": "${chapter.chapterTitle}",
  "chapterSlug": "${chapter.chapterId}",
  "subContent": ${JSON.stringify(chapter.subContent.slice(0, 3))}
}

Return ONLY valid JSON.
`;

  const result = await model.generateContent(prompt);
  let aiText = result.response.text().trim();

  if (aiText.startsWith("```")) {
    aiText = aiText.replace(/```json|```/g, "").trim();
  }

  // 🔒 sadece array kısmını al
  const start = aiText.indexOf("[");
  const end = aiText.lastIndexOf("]");
  if (start === -1 || end === -1) {
    console.error("AI RAW OUTPUT:", aiText);
    throw new Error("Invalid AI JSON");
  }

  const slides: Slide[] = JSON.parse(
    aiText.slice(start, end + 1)
  );

  /* ---------- TTS + DB ---------- */
  for (const slide of slides) {
    try {
      const chunks = chunkText(slide.narration.fullText);
      const audioBuffers: Buffer[] = [];

      for (const chunk of chunks) {
        await sleep(7000); // ⏱️ rate limit koruması

        const res = await axios.post(
          "https://api.fonada.ai/tts/generate-audio-large",
          {
            input: chunk,
            voice: "Vaanee",
            language: "English",
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.FONADALAB_API_KEY}`,
              "Content-Type": "application/json",
            },
            responseType: "arraybuffer",
            timeout: 120000,
          }
        );

        audioBuffers.push(Buffer.from(res.data));
      }

      const audioUrl = await saveAudio(
        Buffer.concat(audioBuffers),
        slide.slideId
      );

      const captions = await generateCaptions(audioUrl);

      await db.insert(chapterContentSlides).values({
        chapterId: chapter.chapterId,
        courseId,
        slideId: slide.slideId,
        slideIndex: slide.slideIndex,
        audioFileName: slide.audioFileName,
        audioFileUrl: audioUrl,
        narration: slide.narration,
        html: slide.html,
        revelData: slide.revealData,
        caption: captions,
      });

      console.log("✅ SLIDE OK:", slide.slideId);

    } catch (err) {
      console.error("❌ SLIDE ERROR:", slide.slideId, err);
    }
  }

  return NextResponse.json({
    success: true,
    totalSlides: slides.length,
  });
}
