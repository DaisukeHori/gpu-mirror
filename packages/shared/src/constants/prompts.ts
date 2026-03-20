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

export const buildRefineStep1Prompt = (params: {
  customInstruction: string;
  angleLabels: string[];
}): string => {
  const imageList = params.angleLabels.map((label, i) => `Image ${i + 2}: Previous ${label} angle`).join('\n');
  return `You are refining a hairstyle based on the customer's feedback.

Image 1 is the customer's original photo.
${imageList}

These images show the previous hairstyle generation from all angles. The customer wants the following change applied:
"${params.customInstruction}"

Generate a NEW front-facing photo of this person with the requested change applied to the hairstyle. Use the previous generation as the base style and modify it according to the instruction.

Rules:
- Keep the person's face, identity, skin tone, and facial expression EXACTLY the same as Image 1.
- The hairstyle should be based on the previous generation but with the customer's requested changes.
- The result must look like a natural photograph taken in a beauty salon.
- Show the person from the front, looking directly at the camera.`;
};

export const buildRefineStep2Prompt = (params: {
  customInstruction: string;
  angle: string;
  angleInstruction: string;
}): string => {
  return `You are generating a specific angle view that must be consistent with an already-confirmed front view.

Image 1 is the CONFIRMED new front-facing hairstyle — this is the definitive reference for hair color, length, volume, and style.

The customer requested: "${params.customInstruction}"

Generate a ${params.angleInstruction}

CRITICAL RULES:
- The hairstyle MUST match Image 1 (the confirmed front view) exactly in terms of color, length, texture, and overall style.
- Hair flow, volume, and layering must be physically consistent with how the front view would look from this angle.
- Keep the person's face and identity the same.
- The result must look like a natural photograph taken in a beauty salon.
- Preserve realistic lighting consistent with the angle.`;
};

