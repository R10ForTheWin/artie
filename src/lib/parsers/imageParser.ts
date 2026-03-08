import Anthropic from '@anthropic-ai/sdk';
import type { ParsedWorkout } from './index';

const client = new Anthropic();

export async function parseImage(buffer: Buffer, mimeType: string): Promise<ParsedWorkout> {
  let imageBuffer = buffer;
  let imageMimeType = mimeType;

  // Claude doesn't support HEIC — convert to JPEG via sharp
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const sharp = (await import('sharp')).default;
    imageBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    imageMimeType = 'image/jpeg';
  }

  const base64 = imageBuffer.toString('base64');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Extract workout data from this fitness app screenshot and return ONLY valid JSON with these fields:
- workout_date: ISO 8601 date string (YYYY-MM-DD), use today's date if not shown
- duration_s: total duration in seconds (integer), convert h:m:s or mm:ss accordingly
- distance_m: distance in meters (float), convert miles × 1609.34 if needed
- avg_speed_ms: average speed in m/s (float), convert min/mile pace: m/s = 1609.34 / (pace_seconds)
- max_speed_ms: max speed in m/s (float), same conversion
- calories: calories burned (integer)

Use null for any field not visible. Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Strip any markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(jsonText);

  return {
    workout_date: parsed.workout_date ?? new Date().toISOString().split('T')[0],
    duration_s: parsed.duration_s ?? null,
    distance_m: parsed.distance_m ?? null,
    avg_speed_ms: parsed.avg_speed_ms ?? null,
    max_speed_ms: parsed.max_speed_ms ?? null,
    avg_hr: null,
    max_hr: null,
    calories: parsed.calories ?? null,
  };
}

export async function parseLapsImage(buffer: Buffer, mimeType: string): Promise<number[]> {
  let imageBuffer = buffer;
  let imageMimeType = mimeType;

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const sharp = (await import('sharp')).default;
    imageBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    imageMimeType = 'image/jpeg';
  }

  const base64 = imageBuffer.toString('base64');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `This is a laps tab screenshot from a fitness app. Extract the time in seconds for each FULL mile lap only (distance = 1.00 mi). Exclude any partial laps (distance < 1.00 mi). Return ONLY a JSON array of integers representing each full lap's time in seconds, in lap order. Example: [776, 673, 793, 821]. No other text.`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const splits = JSON.parse(jsonText);
  return Array.isArray(splits) ? splits.filter((n) => typeof n === 'number') : [];
}
