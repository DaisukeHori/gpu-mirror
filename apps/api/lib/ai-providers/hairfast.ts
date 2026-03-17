import type { AIProvider } from '../ai-gateway';

/**
 * HairFastGAN provider — Phase 2 expansion.
 * Self-hosted hair transfer model for faster, lower-cost generation.
 * Endpoint will be a GPU server running the HairFastGAN inference API.
 */
export class HairFastProvider implements AIProvider {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint ?? process.env.HAIRFAST_ENDPOINT ?? '';
  }

  async generateSingle(input: {
    customerPhoto: Buffer;
    referencePhoto?: Buffer;
    prompt: string;
  }): Promise<{
    image: Buffer;
    latencyMs: number;
    estimatedCostUsd: number;
    model: string;
  }> {
    throw new Error(
      'HairFastGAN provider is not yet implemented. ' +
      'This is a Phase 2 feature. See design doc Section 13.',
    );
  }
}
