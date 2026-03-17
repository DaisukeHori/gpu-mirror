import type { ColorFamily } from '../types/database';

export interface HairColorSeed {
  name: string;
  name_en: string;
  hex_code: string;
  color_family: ColorFamily;
  level: number | null;
  sort_order: number;
}

export const COLOR_FAMILIES: { family: ColorFamily; label_en: string }[] = [
  { family: 'ブラック系', label_en: 'Black' },
  { family: 'ブラウン系', label_en: 'Brown' },
  { family: 'ベージュ系', label_en: 'Beige' },
  { family: 'アッシュ系', label_en: 'Ash' },
  { family: 'グレー系', label_en: 'Gray' },
  { family: 'レッド系', label_en: 'Red' },
  { family: 'ピンク系', label_en: 'Pink' },
  { family: 'オレンジ系', label_en: 'Orange' },
  { family: 'イエロー系', label_en: 'Yellow' },
  { family: 'グリーン系', label_en: 'Green' },
  { family: 'ブルー系', label_en: 'Blue' },
  { family: 'パープル系', label_en: 'Purple' },
  { family: 'ハイトーン系', label_en: 'High Tone' },
];

export const HAIR_COLOR_SEEDS: HairColorSeed[] = [
  { name: 'ナチュラルブラック', name_en: 'Natural Black', hex_code: '#1A1A1A', color_family: 'ブラック系', level: 3, sort_order: 1 },
  { name: 'ソフトブラック', name_en: 'Soft Black', hex_code: '#2D2D2D', color_family: 'ブラック系', level: 4, sort_order: 2 },
  { name: 'ダークブラウン', name_en: 'Dark Brown', hex_code: '#3B2314', color_family: 'ブラウン系', level: 5, sort_order: 3 },
  { name: 'チョコレートブラウン', name_en: 'Chocolate Brown', hex_code: '#5C3A1E', color_family: 'ブラウン系', level: 6, sort_order: 4 },
  { name: 'ミルクティーブラウン', name_en: 'Milk Tea Brown', hex_code: '#A07B5A', color_family: 'ブラウン系', level: 9, sort_order: 5 },
  { name: 'ベージュブラウン', name_en: 'Beige Brown', hex_code: '#B89B7A', color_family: 'ベージュ系', level: 10, sort_order: 6 },
  { name: 'ミルクティーベージュ', name_en: 'Milk Tea Beige', hex_code: '#C8A882', color_family: 'ベージュ系', level: 11, sort_order: 7 },
  { name: 'アッシュブラウン', name_en: 'Ash Brown', hex_code: '#6B5B4F', color_family: 'アッシュ系', level: 7, sort_order: 8 },
  { name: 'アッシュベージュ', name_en: 'Ash Beige', hex_code: '#9B8B7A', color_family: 'アッシュ系', level: 10, sort_order: 9 },
  { name: 'アッシュグレー', name_en: 'Ash Gray', hex_code: '#7A7A7A', color_family: 'グレー系', level: 8, sort_order: 10 },
  { name: 'シルバーグレー', name_en: 'Silver Gray', hex_code: '#A8A8A8', color_family: 'グレー系', level: 12, sort_order: 11 },
  { name: 'チェリーレッド', name_en: 'Cherry Red', hex_code: '#8B2252', color_family: 'レッド系', level: 8, sort_order: 12 },
  { name: 'ワインレッド', name_en: 'Wine Red', hex_code: '#6B2142', color_family: 'レッド系', level: 6, sort_order: 13 },
  { name: 'ピンクベージュ', name_en: 'Pink Beige', hex_code: '#C4907A', color_family: 'ピンク系', level: 10, sort_order: 14 },
  { name: 'ラベンダーピンク', name_en: 'Lavender Pink', hex_code: '#B88AA5', color_family: 'ピンク系', level: 12, sort_order: 15 },
  { name: 'オレンジブラウン', name_en: 'Orange Brown', hex_code: '#A0603A', color_family: 'オレンジ系', level: 8, sort_order: 16 },
  { name: 'アプリコットオレンジ', name_en: 'Apricot Orange', hex_code: '#C87E4A', color_family: 'オレンジ系', level: 11, sort_order: 17 },
  { name: 'ハニーイエロー', name_en: 'Honey Yellow', hex_code: '#D4A84A', color_family: 'イエロー系', level: 13, sort_order: 18 },
  { name: 'オリーブグリーン', name_en: 'Olive Green', hex_code: '#6B7A4A', color_family: 'グリーン系', level: 8, sort_order: 19 },
  { name: 'ネイビーブルー', name_en: 'Navy Blue', hex_code: '#2A3A5A', color_family: 'ブルー系', level: 6, sort_order: 20 },
  { name: 'ラベンダー', name_en: 'Lavender', hex_code: '#8A6AAA', color_family: 'パープル系', level: 12, sort_order: 21 },
  { name: 'プラチナブロンド', name_en: 'Platinum Blonde', hex_code: '#E8D8C0', color_family: 'ハイトーン系', level: 15, sort_order: 22 },
  { name: 'ホワイトブロンド', name_en: 'White Blonde', hex_code: '#F0E8D8', color_family: 'ハイトーン系', level: 17, sort_order: 23 },
];
