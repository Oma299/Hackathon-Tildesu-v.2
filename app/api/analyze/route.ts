import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { analyzeTranscript, compareToReference } from '@/lib/speech-analysis';

const SCREENING_REFERENCE_WORDS = ['рыба', 'кораблик', 'лягушка', 'барабан', 'журавель', 'тарелка'];

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^а-яё]/gi, '');
}

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get('audio') as File | null) ?? (formData.get('file') as File | null);

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    if (!groq) {
      return NextResponse.json({ error: 'GROQ_API_KEY не настроен' }, { status: 500 });
    }

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'ru',
    });

    const recognizedText = transcription.text || '';
    const durationSec = Number(formData.get('duration') || 10);
    const analysisType = String(formData.get('analysisType') || 'free').toLowerCase();
    const referenceText = String(formData.get('referenceText') || '').trim();

    if (analysisType === 'reference' && referenceText) {
      const referenceAnalysis = compareToReference(referenceText, recognizedText, durationSec);

      return NextResponse.json({
        text: recognizedText,
        transcription: recognizedText,
        wordCount: referenceAnalysis.totalWords,
        word_count: referenceAnalysis.totalWords,
        repetitions: referenceAnalysis.errorCount,
        error_count: referenceAnalysis.errorCount,
        score: referenceAnalysis.fluencyIndex,
        fluencyIndex: referenceAnalysis.fluencyIndex,
        accuracyIndex: referenceAnalysis.fluencyIndex,
        correctCount: referenceAnalysis.totalWords - referenceAnalysis.errorCount,
        errorCount: referenceAnalysis.errorCount,
        riskLevel: referenceAnalysis.riskLevel,
        risk_level: referenceAnalysis.riskLevel,
        wpm: referenceAnalysis.speechRate ?? 0,
        speech_rate: referenceAnalysis.speechRate ?? 0,
        recommendation: referenceAnalysis.recommendation,
        referenceWords: referenceAnalysis.referenceWords.map((word) => ({
          text: word.text,
          observedText: recognizedText,
          isCorrect: word.status === 'correct',
        })),
      });
    }

    if (analysisType === 'screening') {
      const normalizedRecognizedWords = recognizedText
        .split(/\s+/)
        .map((word) => normalizeWord(word))
        .filter(Boolean);

      const comparedWords = SCREENING_REFERENCE_WORDS.map((expected, idx) => {
        const observed = normalizedRecognizedWords[idx] || '';
        return {
          text: expected,
          observedText: observed || '',
          isCorrect: normalizeWord(observed) === normalizeWord(expected),
        };
      });

      const correctCount = comparedWords.filter((word) => word.isCorrect).length;
      const errorCount = comparedWords.filter((word) => !word.isCorrect).length;
      const accuracyIndex = Math.round((correctCount / SCREENING_REFERENCE_WORDS.length) * 100);

      return NextResponse.json({
        text: recognizedText,
        transcription: recognizedText,
        wordCount: SCREENING_REFERENCE_WORDS.length,
        word_count: SCREENING_REFERENCE_WORDS.length,
        repetitions: errorCount,
        error_count: errorCount,
        score: accuracyIndex,
        fluencyIndex: accuracyIndex,
        accuracyIndex,
        correctCount,
        errorCount,
        riskLevel: accuracyIndex >= 85 ? 'Низкий' : accuracyIndex >= 65 ? 'Средний' : 'Высокий',
        risk_level: accuracyIndex >= 85 ? 'Низкий' : accuracyIndex >= 65 ? 'Средний' : 'Высокий',
        wpm: Math.round((correctCount / Math.max(durationSec, 1)) * 60),
        speech_rate: Math.round((correctCount / Math.max(durationSec, 1)) * 60),
        recommendation: accuracyIndex >= 85
          ? 'Речь в пределах нормы. Слова произнесены верно.'
          : accuracyIndex >= 65
            ? 'Обнаружены отдельные ошибки в произношении ключевых слов.'
            : 'Нужно ещё поработать над произнесением ключевых слов.'
        ,
        referenceWords: comparedWords,
      });
    }

    const freeAnalysis = analyzeTranscript(recognizedText, durationSec);
    const wpm = durationSec > 0 ? Math.round((freeAnalysis.wordCount / durationSec) * 60) : Math.round((freeAnalysis.wordCount / 10) * 60);

    return NextResponse.json({
      text: recognizedText,
      transcription: recognizedText,
      wordCount: freeAnalysis.wordCount,
      word_count: freeAnalysis.wordCount,
      repetitions: freeAnalysis.stumbleCount,
      error_count: freeAnalysis.stumbleCount,
      score: freeAnalysis.fluencyIndex,
      fluencyIndex: freeAnalysis.fluencyIndex,
      accuracyIndex: freeAnalysis.fluencyIndex,
      correctCount: freeAnalysis.wordCount,
      errorCount: freeAnalysis.stumbleCount,
      riskLevel: freeAnalysis.riskLevel,
      risk_level: freeAnalysis.riskLevel,
      wpm,
      speech_rate: wpm,
      words: freeAnalysis.words,
      recommendation: freeAnalysis.recommendation,
    });
  } catch (error: any) {
    console.error('Ошибка Groq:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
