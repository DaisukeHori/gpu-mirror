import * as Haptics from 'expo-haptics';

type ImpactStyle = keyof typeof Haptics.ImpactFeedbackStyle;

async function triggerImpact(style: ImpactStyle) {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
  } catch {
    // Browsers and simulators may ignore or reject haptics.
  }
}

export function impactLight() {
  return triggerImpact('Light');
}

export function impactMedium() {
  return triggerImpact('Medium');
}
