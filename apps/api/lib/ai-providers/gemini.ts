import { GoogleGenAI } from '@google/genai';
import type { AIProvider, GenerateSingleInput, GenerateSingleOutput } from '../ai-gateway';
import { COST_PER_IMAGE_USD } from '@revol-mirror/shared';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // GEMINI_BASE_URL が設定されていれば、カスタムバックエンド（Stable-Hair等）に接続
    const baseUrl = process.env.GEMINI_BASE_URL;
    const bypassSecret = process.env.VERCEL_PROTECTION_BYPASS;

    this.client = new GoogleGenAI({
      apiKey,
      ...(baseUrl && {
        httpOptions: {
          baseUrl,
          ...(bypassSecret && {
            headers: { 'x-vercel-protection-bypass': bypassSecret },
          }),
        },
      }),
    });
    this.model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-image-preview';
  }

  async generateSingle(input: GenerateSingleInput): Promise<GenerateSingleOutput> {
    const start = Date.now();

    const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: input.customerPhoto.toString('base64'),
      },
    });

    if (input.referencePhoto) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: input.referencePhoto.toString('base64'),
        },
      });
    }

    if (input.additionalImages) {
      for (const img of input.additionalImages) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: img.toString('base64'),
          },
        });
      }
    }

    parts.push({ text: input.prompt });

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: ['Text', 'Image'],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('No response from Gemini API');
    }

    const imagePart = candidate.content.parts.find(
      (p) => 'inlineData' in p && p.inlineData?.mimeType?.startsWith('image/'),
    );

    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
      throw new Error('No image in Gemini API response');
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const latencyMs = Date.now() - start;

    return {
      image: imageBuffer,
      latencyMs,
      estimatedCostUsd: COST_PER_IMAGE_USD,
      model: this.model,
    };
  }
}
