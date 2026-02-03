import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import Replicate from "replicate";
import OpenAI from "openai";
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

console.log("🔑 OPENAI KEY USED:", process.env.OPENAI_API_KEY?.slice(0, 8));

/* ================= HELPERS ================= */

function extractJsonArray(text: string): any[] {
  if (!text) throw new Error("EMPTY_AI_TEXT");

  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```json|```/g, "").trim();
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    console.error("❌ AI OUTPUT (NO JSON ARRAY):", cleaned.slice(0, 800));
    throw new Error("AI_DID_NOT_RETURN_JSON_ARRAY");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
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

async function generateTTS(text: string): Promise<Buffer> {
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  return Buffer.from(await speech.arrayBuffer());
}

/* ================= SLIDE GENERATION ================= */

async function generateSlidesWithOpenAI(chapter: any): Promise<Slide[]> {
  const prompt = `
${GENERATE_VIDEO_CONTENT_PROMPT}

INPUT:
{
  "courseName": "${chapter.courseName ?? ""}",
  "chapterTitle": "${chapter.chapterTitle}",
  "chapterSlug": "${chapter.chapterId}",
  "subContent": ${JSON.stringify((chapter.subContent ?? []).slice(0, 3))}
}

Return ONLY valid JSON array.
`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON generator. Return ONLY valid JSON. No markdown. No explanation.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = resp.choices?.[0]?.message?.content ?? "";
  const slidesRaw = extractJsonArray(text);

  if (!Array.isArray(slidesRaw) || slidesRaw.length === 0) {
    throw new Error("NO_SLIDES_RETURNED");
  }

  return slidesRaw.map((s: any) => ({
    slideId: String(s.slideId),
    slideIndex: Number(s.slideIndex),
    title: String(s.title ?? ""),
    subtitle: String(s.subtitle ?? ""),
    audioFileName: String(s.audioFileName ?? `${s.slideId}.mp3`),
    narration: { fullText: String(s.narration?.fullText ?? "") },
    html: String(s.html ?? ""),
    revealData: Array.isArray(s.revealData) ? s.revealData.map(String) : [],
  }));
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  const { chapter, courseId } = await req.json();

  /* ---------- GUARD ---------- */
  const existing = await db
    .select()
    .from(chapterContentSlides)
    .where(eq(chapterContentSlides.chapterId, chapter.chapterId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ success: true, skipped: true });
  }

  /* ---------- GENERATE SLIDES ---------- */
  const slides = await generateSlidesWithOpenAI(chapter);

  /* ---------- TTS + DB ---------- */
  for (const slide of slides) {
    try {
      const audioBuffer = await generateTTS(slide.narration.fullText);
      const audioUrl = await saveAudio(audioBuffer, slide.slideId);
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
        revelData: slide.revealData ?? [],
        caption: captions,
      });
    } catch (e) {
      console.error("❌ SLIDE ERROR:", slide.slideId, e);
    }
  }

  return NextResponse.json({
    success: true,
    totalSlides: slides.length,
  });
}
