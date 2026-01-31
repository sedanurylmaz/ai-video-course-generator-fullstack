import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { VideoSlidesDummy } from "@/data/Dummy";
import { Storage } from "@google-cloud/storage";
import Replicate from "replicate";
import { chapterContentSlides } from "@/config/schema";
import { db } from "@/config/db";

type SlideWithAudio = (typeof VideoSlidesDummy)[number] & {
  audioUrls?: string[];
};

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY || "",
});

/**
 * Metni belirli uzunluklarda parçalara böler
 */
function chunkText(text: string, size = 400) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  const { chapter, courseId } = await req.json();

  if (!process.env.FONADALAB_API_KEY) {
    throw new Error("FONADA API KEY is missing");
  }

  /**
   * 1️⃣ SLIDE LISTESİ (şimdilik Dummy)
   * Her eleman = 1 video sahnesi
   */
  const slides = VideoSlidesDummy as SlideWithAudio[];

  console.log("SLIDE COUNT:", slides.length);

  const processedSlides: {
    slideId: string;
    audioFileUrl: string;
  }[] = [];

  /**
   * 2️⃣ TÜM SLIDE'LAR İÇİN PIPELINE
   */
  for (const slide of slides) {
    try {
      const narration = slide.narration?.fullText;
      if (!narration) {
        console.warn("⏭️ Narration yok, slide atlandı:", slide.slideId);
        continue;
      }

      /**
       * 3️⃣ TTS – narration → chunk → audio buffer
       */
      const chunks = chunkText(narration, 400);
      const audioBuffers: Buffer[] = [];

      for (let j = 0; j < chunks.length; j++) {
        const fonadaResult = await axios.post(
          "https://api.fonada.ai/tts/generate-audio-large",
          {
            input: chunks[j],
            voice: "Vaanee",
            language: "English",
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FONADALAB_API_KEY}`,
            },
            responseType: "arraybuffer",
            timeout: 120000,
          }
        );

        audioBuffers.push(Buffer.from(fonadaResult.data));
      }

      if (audioBuffers.length === 0) {
        console.warn("⏭️ Audio üretilemedi:", slide.slideId);
        continue;
      }

      /**
       * 4️⃣ AUDIO MERGE → TEK MP3
       */
      const finalAudioBuffer = Buffer.concat(audioBuffers);

      const audioFileUrl = await SaveAudioToStorage(
        finalAudioBuffer,
        slide.slideId
      );

      slide.audioUrls = [audioFileUrl];

      /**
       * 5️⃣ CAPTION – tüm narration için
       */
      const captions = await GenerateCaptions(audioFileUrl);

      /**
       * 6️⃣ DB INSERT (slide başına 1 kayıt)
       */
      await db.insert(chapterContentSlides).values({
        chapterId: chapter.chapterId,
        courseId: courseId,
        slideIndex: slide.slideIndex,
        slideId: slide.slideId,
        audioFileName: slide.audioFileName,
        audioFileUrl: audioFileUrl, // ✅ NOT NULL
        narration: slide.narration,
        html: slide.html,
        revelData: slide.revealData,
        caption: captions,
      });

      console.log("✅ SLIDE OK:", slide.slideId);

      processedSlides.push({
        slideId: slide.slideId,
        audioFileUrl,
      });

    } catch (err) {
      console.error("❌ SLIDE ERROR:", slide.slideId, err);
      // bir slide patlarsa tüm pipeline durmasın
      continue;
    }
  }

  /**
   * 7️⃣ RESPONSE
   */
  return NextResponse.json({
    success: true,
    totalSlides: slides.length,
    processedSlides: processedSlides.length,
    slides: processedSlides,
  });
}

/**
 * ☁️ AUDIO SAVE – GOOGLE CLOUD STORAGE
 */
const SaveAudioToStorage = async (
  AudioBuffer: Buffer,
  fileName: string
) => {
  const file = bucket.file(`${fileName}.mp3`);

  await file.save(AudioBuffer, {
    contentType: "audio/mpeg",
    resumable: false,
  });

  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
};

/**
 * 🎤 CAPTION – WHISPER (REPLICATE)
 */
const GenerateCaptions = async (audioUrl: string) => {
  const input = {
    audio: audioUrl,
    batch_size: 64,
  };

  const output = await replicate.run(
    "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
    { input }
  );

  return output;
};
