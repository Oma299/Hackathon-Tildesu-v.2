import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const durationSec = Number(formData.get('duration')) || 10; 

    if (!audioFile) {
      return NextResponse.json({ error: "Аудио не найдено" }, { status: 400 });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      language: "ru", 
    });

    const text = transcription.text;

    const words = text.toLowerCase().match(/[а-яё]+/g) || [];
    const wordCount = words.length;

    const wordsPerMinute = Math.round((wordCount / durationSec) * 60);

    let repetitions = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i+1]) {
        repetitions++;
      }
    }

    return NextResponse.json({
      text: text,
      wordCount: wordCount,
      wpm: wordsPerMinute,
      repetitions: repetitions
    });

  } catch (error) {
    console.error("Ошибка API:", error);
    return NextResponse.json({ error: "Ошибка при анализе" }, { status: 500 });
  }
}