import { GoogleGenAI } from '@google/genai';
import type { AIProvider, GenerateSingleInput, GenerateSingleOutput } from '../ai-gateway';

const COST_PER_IMAGE = 0.039;

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-preview-image-generation';
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
      estimatedCostUsd: COST_PER_IMAGE,
      model: this.model,
    };
  }
}
