import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

export async function POST(request: NextRequest) {
    try {
        // =====================================================
        // 1. READ REQUEST
        // =====================================================

        const body = await request.json();

        const text = typeof body?.text === 'string' ? body.text.trim() : '';

        if (!text) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Text is required',
                },
                {
                    status: 400,
                }
            );
        }

        // =====================================================
        // 2. READ API KEY
        // =====================================================

        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

        // =====================================================
        // 3. DEBUG
        // =====================================================

        console.log('🔐 ELEVENLABS KEY CHECK:', {
            exists: Boolean(apiKey),
            length: apiKey?.length ?? 0,
            prefix: apiKey?.slice(0, 3) ?? '',
        });

        console.log('🔊 ELEVENLABS VOICE ID:', VOICE_ID);

        console.log('🤖 ELEVENLABS MODEL:', 'eleven_v3');

        if (!apiKey) {
            console.error('❌ Missing ELEVENLABS_API_KEY');

            return NextResponse.json(
                {
                    success: false,
                    message: 'ELEVENLABS_API_KEY chưa được cấu hình trong .env.local.',
                },
                {
                    status: 500,
                }
            );
        }

        // =====================================================
        // 4. REQUEST LOG
        // =====================================================

        console.log('========================================');

        console.log('🔊 ELEVENLABS V3 TTS REQUEST');

        console.log('Voice ID:', VOICE_ID);

        console.log('Text:', text);

        // =====================================================
        // 5. CALL ELEVENLABS V3
        // =====================================================

        const response = await fetch(`${ELEVENLABS_API_URL}/${VOICE_ID}?output_format=mp3_44100_128`, {
            method: 'POST',

            headers: {
                'xi-api-key': apiKey,

                'Content-Type': 'application/json',

                Accept: 'audio/mpeg',
            },

            body: JSON.stringify({
                text,

                // ⭐ ELEVEN V3
                model_id: 'eleven_v3',
            }),
        });

        // =====================================================
        // 6. RESPONSE
        // =====================================================

        console.log('🔊 ElevenLabs HTTP status:', response.status);

        console.log('🔊 ElevenLabs content-type:', response.headers.get('content-type'));

        // =====================================================
        // 7. ERROR
        // =====================================================

        if (!response.ok) {
            const errorText = await response.text();

            console.error('❌ ElevenLabs v3 error:', response.status, errorText);

            return NextResponse.json(
                {
                    success: false,

                    message: 'ElevenLabs V3 TTS request failed.',

                    detail: errorText,
                },
                {
                    status: response.status,
                }
            );
        }

        // =====================================================
        // 8. AUDIO
        // =====================================================

        const audioBuffer = await response.arrayBuffer();

        console.log('🔊 Audio buffer size:', audioBuffer.byteLength, 'bytes');

        if (audioBuffer.byteLength === 0) {
            console.error('❌ ElevenLabs trả về audio rỗng.');

            return NextResponse.json(
                {
                    success: false,

                    message: 'ElevenLabs trả về audio rỗng.',
                },
                {
                    status: 500,
                }
            );
        }

        // =====================================================
        // 9. SUCCESS
        // =====================================================

        console.log('✅ ElevenLabs V3 TTS thành công.');

        console.log('========================================');

        return new NextResponse(audioBuffer, {
            status: 200,

            headers: {
                'Content-Type': 'audio/mpeg',

                'Cache-Control': 'no-store, no-cache, must-revalidate',

                'Content-Length': String(audioBuffer.byteLength),
            },
        });
    } catch (error) {
        console.error('❌ TTS route error:', error);

        return NextResponse.json(
            {
                success: false,

                message: 'Không thể tạo giọng nói.',

                detail: error instanceof Error ? error.message : String(error),
            },
            {
                status: 500,
            }
        );
    }
}
