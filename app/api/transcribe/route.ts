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

    // If an API key is provided (Groq or OpenAI), call Whisper AI
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
      whisperFormData.append(
        'prompt',
        'Dahod jewellery store customer records, gold and silver loans, गिरवी, ગિરવે, Ramesh Patel, Suresh Damor, Vova village, Garbada, Limkheda, Kandora, Kada, grams, tola, diary page'
      );

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

    // Try free public HuggingFace Whisper endpoint if no key is configured
    try {
      const hfResponse = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
        },
        body: audioFile,
      });

      if (hfResponse.ok) {
        const hfData = await hfResponse.json();
        if (hfData && hfData.text) {
          return NextResponse.json({
            transcript: hfData.text,
            source: 'huggingface_whisper',
          });
        }
      }
    } catch (hfErr) {
      console.warn('Huggingface Whisper fallback attempt:', hfErr);
    }

    // If no cloud API key is configured yet, return clear prompt with setup guide
    return NextResponse.json({
      transcript: '',
      requiresKey: true,
      message: 'To use our custom Whisper Speech Engine, please provide a Groq or OpenAI API key in Settings or enter it when prompted.',
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
