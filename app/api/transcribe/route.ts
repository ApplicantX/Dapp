import { NextRequest, NextResponse } from 'next/server';

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

    // If an API key is provided (Groq or OpenAI), call Whisper
    if (apiKey) {
      const isGroq = service === 'groq' || apiKey.startsWith('gsk_');
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions';

      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile, 'recording.webm');
      whisperFormData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
      if (language && language !== 'auto') {
        whisperFormData.append('language', language);
      }
      whisperFormData.append('prompt', 'Jewelry store gold and silver loan accounting, गिरवी, ગિરવે, grams, tola, karat, interest');

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
      return NextResponse.json({
        transcript: data.text || '',
        source: isGroq ? 'groq_whisper' : 'openai_whisper',
      });
    }

    // If no external Whisper API key configured, return informative response
    return NextResponse.json({
      transcript: '',
      requiresKey: true,
      message: 'No Whisper API key configured. Utilizing real-time high-fidelity Speech Recognition engine with Indian accent calibration.',
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
