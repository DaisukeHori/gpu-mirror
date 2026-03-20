import type { SimulationMode } from '../types/database';
import { ANGLE_INSTRUCTIONS } from './angles';

export interface PromptParams {
  mode: SimulationMode;
  angle: string;
  colorName?: string;
  colorHex?: string;
  colorDescription?: string;
  customInstruction?: string;
}

export const buildPrompt = (params: PromptParams): string => {
  const angleInst = ANGLE_INSTRUCTIONS[params.angle as keyof typeof ANGLE_INSTRUCTIONS] ?? '';

  let base: string;
  switch (params.mode) {
    case 'style':
      base = 'Apply the exact hairstyle from the second image to the person in the first image.';
      break;
    case 'color':
      base = params.colorName
        ? `Change ONLY the hair color of the person to ${params.colorName}${params.colorHex ? ` (${params.colorHex})` : ''}.`
        : 'Apply a stylish new hair color to the person in the first image.';
      break;
    case 'style_and_color':
      base = params.colorName
        ? `Apply the hairstyle from the second image AND change the hair color to ${params.colorName}${params.colorHex ? ` (${params.colorHex})` : ''}.`
        : 'Apply the hairstyle from the second image to the person in the first image with a complementary hair color.';
      break;
  }

  const customPart = params.customInstruction
    ? `\n\nAdditional styling instruction from the customer:\n"${params.customInstruction}"`
    : '';

  return `${base}

${angleInst}
${customPart}
Rules:
- Keep the person's face, identity, skin tone, and facial expression EXACTLY the same.
- The result must look like a natural photograph taken in a beauty salon.
- The hair should look freshly styled, with natural shine and movement.
- Preserve realistic lighting consistent with the angle.`;
};

export const COST_PER_IMAGE_USD = 0.039;
