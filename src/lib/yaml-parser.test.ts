import { describe, expect, it } from "vitest";
import { parseExercises } from "./yaml-parser";

describe("parseExercises", () => {
  it("parses entries when top-level chinese appears before english", () => {
    const yaml = `- english: This hill isn't too steep.
  chunks:
  - chinese: 这
    pinyin: zhè
    transliteration: this
  - chinese: 个
    pinyin: gè
    transliteration: (classifier)
  - chinese: 山
    pinyin: shān
    transliteration: hill
  - chinese: 不
    pinyin: bù
    transliteration: not
  - chinese: 太
    pinyin: tài
    transliteration: too
  - chinese: 高
    pinyin: gāo
    transliteration: steep
  - chinese: 。
    pinyin: 。
    transliteration: ''
- chinese: 我知道了。
  english: I got it. / I know now.
  chunks:
  - chinese: 我
    pinyin: wǒ
    transliteration: I
  - chinese: 知道
    pinyin: zhīdao
    transliteration: know
  - chinese: 了
    pinyin: le
    transliteration: (change of state)
  - chinese: 。
    pinyin: 。
    transliteration: ''`;

    const exercises = parseExercises(yaml);

    expect(exercises).toHaveLength(2);
    expect(exercises[0].english).toBe("This hill isn't too steep.");
    expect(exercises[0].segments).toHaveLength(7);
    expect(exercises[1].english).toBe("I got it. / I know now.");
    expect(exercises[1].segments.map((segment) => segment.chinese)).toEqual([
      "我",
      "知道",
      "了",
      "。",
    ]);
  });
});
