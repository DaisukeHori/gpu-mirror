-- Seed hair colors
insert into public.hair_colors (name, name_en, hex_code, color_family, level, sort_order) values
  ('ナチュラルブラック', 'Natural Black', '#1A1A1A', 'ブラック系', 3, 1),
  ('ソフトブラック', 'Soft Black', '#2D2D2D', 'ブラック系', 4, 2),
  ('ダークブラウン', 'Dark Brown', '#3B2314', 'ブラウン系', 5, 3),
  ('チョコレートブラウン', 'Chocolate Brown', '#5C3A1E', 'ブラウン系', 6, 4),
  ('ミルクティーブラウン', 'Milk Tea Brown', '#A07B5A', 'ブラウン系', 9, 5),
  ('ベージュブラウン', 'Beige Brown', '#B89B7A', 'ベージュ系', 10, 6),
  ('ミルクティーベージュ', 'Milk Tea Beige', '#C8A882', 'ベージュ系', 11, 7),
  ('アッシュブラウン', 'Ash Brown', '#6B5B4F', 'アッシュ系', 7, 8),
  ('アッシュベージュ', 'Ash Beige', '#9B8B7A', 'アッシュ系', 10, 9),
  ('アッシュグレー', 'Ash Gray', '#7A7A7A', 'グレー系', 8, 10),
  ('シルバーグレー', 'Silver Gray', '#A8A8A8', 'グレー系', 12, 11),
  ('チェリーレッド', 'Cherry Red', '#8B2252', 'レッド系', 8, 12),
  ('ワインレッド', 'Wine Red', '#6B2142', 'レッド系', 6, 13),
  ('ピンクベージュ', 'Pink Beige', '#C4907A', 'ピンク系', 10, 14),
  ('ラベンダーピンク', 'Lavender Pink', '#B88AA5', 'ピンク系', 12, 15),
  ('オレンジブラウン', 'Orange Brown', '#A0603A', 'オレンジ系', 8, 16),
  ('アプリコットオレンジ', 'Apricot Orange', '#C87E4A', 'オレンジ系', 11, 17),
  ('ハニーイエロー', 'Honey Yellow', '#D4A84A', 'イエロー系', 13, 18),
  ('オリーブグリーン', 'Olive Green', '#6B7A4A', 'グリーン系', 8, 19),
  ('ネイビーブルー', 'Navy Blue', '#2A3A5A', 'ブルー系', 6, 20),
  ('ラベンダー', 'Lavender', '#8A6AAA', 'パープル系', 12, 21),
  ('プラチナブロンド', 'Platinum Blonde', '#E8D8C0', 'ハイトーン系', 15, 22),
  ('ホワイトブロンド', 'White Blonde', '#F0E8D8', 'ハイトーン系', 17, 23);

-- Seed catalog categories
insert into public.catalog_categories (name, display_name, icon_name, sort_order) values
  ('short', 'ショート', 'scissors', 1),
  ('bob', 'ボブ', 'scissors', 2),
  ('medium', 'ミディアム', 'scissors', 3),
  ('long', 'ロング', 'scissors', 4),
  ('men', 'メンズ', 'scissors', 5),
  ('arrange', 'アレンジ', 'sparkles', 6);
