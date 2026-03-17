export interface GenerateSingleInput {
  customerPhoto: Buffer;
  referencePhoto?: Buffer;
  prompt: string;
}

export interface GenerateSingleOutput {
  image: Buffer;
  latencyMs: number;
  estimatedCostUsd: number;
  model: string;
}

export interface AIProvider {
  generateSingle(input: GenerateSingleInput): Promise<GenerateSingleOutput>;
}

import { GeminiProvider } from './ai-providers/gemini';

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) {
    provider = new GeminiProvider();
  }
  return provider;
}
