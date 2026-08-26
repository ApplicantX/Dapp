import { NextRequest, NextResponse } from 'next/server';

// Filter out known Whisper hallucination strings
function cleanWhisperTranscript(text: string): string {
  if (!text) return '';
  const hallucinations = [
    /thank you for watching\.?/gi,
    /thanks for watching\.?/gi,
    /thank you\.?/gi,
    /thanks\.?/gi,
    /please subscribe\.?/gi,
    /subtitles by.*$/gi,
    /translated by.*$/gi,
    /amara\.org/gi,
    /watching!/gi,
    /tola,?\s*diary\s*page\.?/gi,
    /grams,?\s*tola,?\s*diary\s*page\.?/gi,
    /\[music\]/gi,
    /\(music\)/gi,
    /\[silence\]/gi,
    /\[applause\]/gi,
    /\(silence\)/gi,
  ];

  let cleaned = text;
  hallucinations.forEach((h) => {
    cleaned = cleaned.replace(h, '');
  });
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const apiKey = (formData.get('apiKey') as string) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const language = (formData.get('language') as string) || 'en';
    const service = (formData.get('service') as string) || 'groq';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Call Groq Whisper or OpenAI Whisper if API key is present
    if (apiKey) {
      const isGroq = service === 'groq' || apiKey.startsWith('gsk_');
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions';

      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile, 'recording.wav');
      whisperFormData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
      if (language && language !== 'auto') {
        whisperFormData.append('language', language);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Whisper API Error:', errText);
        return NextResponse.json(
          { error: `Whisper API failed: ${response.statusText}`, details: errText },
          { status: response.status }
        );
      }

      const data = await response.json();
      const rawText = data.text || '';
      const cleaned = cleanWhisperTranscript(rawText);

      return NextResponse.json({
        transcript: cleaned,
        source: isGroq ? 'groq_whisper' : 'openai_whisper',
      });
    }

    return NextResponse.json({
      transcript: '',
      requiresKey: true,
      message: 'No Whisper API key configured.',
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
