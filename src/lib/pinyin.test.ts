import { describe, it, expect } from "vitest";
import {
  applyToneToSyllable,
  findToneVowelIndex,
  findFirstUntonedSyllable,
  processPinyinInput,
  removeLastTone,
  simulateTyping,
} from "./pinyin";

describe("applyToneToSyllable", () => {
  it("applies tone 1 to simple syllables", () => {
    expect(applyToneToSyllable("ma", 1)).toBe("mā");
    expect(applyToneToSyllable("ni", 1)).toBe("nī");
  });

  it("applies tone 2 to simple syllables", () => {
    expect(applyToneToSyllable("ma", 2)).toBe("má");
    expect(applyToneToSyllable("xue", 2)).toBe("xué");
  });

  it("applies tone 3 to simple syllables", () => {
    expect(applyToneToSyllable("ni", 3)).toBe("nǐ");
    expect(applyToneToSyllable("hao", 3)).toBe("hǎo");
  });

  it("applies tone 4 to simple syllables", () => {
    expect(applyToneToSyllable("shi", 4)).toBe("shì");
    expect(applyToneToSyllable("lv", 4)).toBe("lǜ");
  });

  it("places tone on 'a' or 'e' when present", () => {
    expect(applyToneToSyllable("xue", 2)).toBe("xué"); // e gets the tone
    expect(applyToneToSyllable("lai", 2)).toBe("lái"); // a gets the tone
    expect(applyToneToSyllable("sheng", 1)).toBe("shēng"); // e gets the tone
  });

  it("places tone on 'o' in 'ou'", () => {
    expect(applyToneToSyllable("gou", 3)).toBe("gǒu");
    expect(applyToneToSyllable("dou", 1)).toBe("dōu");
  });

  it("places tone on last vowel otherwise", () => {
    expect(applyToneToSyllable("liu", 2)).toBe("liú");
    expect(applyToneToSyllable("gui", 4)).toBe("guì");
  });
});

describe("findToneVowelIndex", () => {
  it("finds 'a' when present", () => {
    expect(findToneVowelIndex("lai")).toBe(1); // 'a' is at index 1
    expect(findToneVowelIndex("hao")).toBe(1); // 'a' is at index 1
  });

  it("finds 'e' when present (no 'a')", () => {
    expect(findToneVowelIndex("xue")).toBe(2); // 'e' is at index 2
    expect(findToneVowelIndex("sheng")).toBe(2); // 'e' is at index 2
  });

  it("finds 'o' in 'ou'", () => {
    expect(findToneVowelIndex("gou")).toBe(1); // 'o' is at index 1
  });

  it("finds last vowel otherwise", () => {
    expect(findToneVowelIndex("liu")).toBe(2); // 'u' is at index 2
    expect(findToneVowelIndex("ni")).toBe(1); // 'i' is at index 1
  });
});

describe("findFirstUntonedSyllable", () => {
  it("returns first syllable when no tones present", () => {
    const result = findFirstUntonedSyllable("xuesheng", 8);
    expect(result.syllable).toBe("xue");
    expect(result.start).toBe(0);
    expect(result.end).toBe(3);
  });

  it("returns text after last toned syllable", () => {
    const result = findFirstUntonedSyllable("xuésheng", 8);
    expect(result.syllable).toBe("sheng");
    expect(result.start).toBe(3);
  });

  it("returns second syllable after first is toned", () => {
    const result = findFirstUntonedSyllable("nǐhao", 5);
    expect(result.syllable).toBe("hao");
    expect(result.start).toBe(2);
  });

  it("returns last syllable for replacement when all are toned", () => {
    const result = findFirstUntonedSyllable("nǐhǎo", 5);
    // Both syllables have tones, so return the last one for replacement
    expect(result.syllable).toBe("hǎo");
    expect(result.replacing).toBe(true);
  });
});

describe("removeLastTone", () => {
  it("removes tone from single toned vowel", () => {
    expect(removeLastTone("nǐ")).toBe("ni");
    expect(removeLastTone("hǎo")).toBe("hao");
  });

  it("removes only the last tone", () => {
    expect(removeLastTone("nǐhǎo")).toBe("nǐhao");
  });

  it("returns unchanged if no tones", () => {
    expect(removeLastTone("nihao")).toBe("nihao");
  });
});

describe("processPinyinInput", () => {
  it("applies tone to simple syllable", () => {
    const result = processPinyinInput("ni", 2, 3);
    expect(result.newText).toBe("nǐ");
  });

  it("removes tone with 0", () => {
    const result = processPinyinInput("nǐhǎo", 5, 0);
    expect(result.newText).toBe("nǐhao");
  });
});

describe("simulateTyping", () => {
  it("handles simple pinyin with tone", () => {
    expect(simulateTyping("ni3")).toBe("nǐ");
    expect(simulateTyping("hao3")).toBe("hǎo");
  });

  it("handles two syllables typed sequentially", () => {
    expect(simulateTyping("ni3hao3")).toBe("nǐhǎo");
  });

  it("handles xuesheng with tones 2 and 1", () => {
    // This is the failing case!
    expect(simulateTyping("xuesheng21")).toBe("xuéshēng");
  });

  it("handles tones in reverse order", () => {
    expect(simulateTyping("xue2sheng1")).toBe("xuéshēng");
  });

  it("handles tone 0 to remove last tone", () => {
    expect(simulateTyping("ni3hao30")).toBe("nǐhao");
  });

  it("handles consecutive tone removals", () => {
    expect(simulateTyping("ni3hao300")).toBe("nihao");
  });

  it("handles lv for ü", () => {
    expect(simulateTyping("lv4")).toBe("lǜ");
  });

  it("handles complex multi-syllable words", () => {
    expect(simulateTyping("zhongguo12")).toBe("zhōngguó");
    expect(simulateTyping("zhongguo14")).toBe("zhōngguò");
  });

  it("replaces last syllable tone when all syllables are toned", () => {
    // When all syllables have tones, new tones replace the last syllable
    expect(simulateTyping("ni3hao31")).toBe("nǐhāo");
    expect(simulateTyping("ni3hao312")).toBe("nǐháo");
  });

  it("converts v to ü without tone", () => {
    // v should be converted to ü even without a tone number
    expect(simulateTyping("nv")).toBe("nü");
    expect(simulateTyping("lv")).toBe("lü");
  });

  it("handles nüer with tones (ue after n/l treated as üe)", () => {
    // After n or l, 'ue' should be treated as 'üe'
    expect(simulateTyping("nuer32")).toBe("nǚér");
    expect(simulateTyping("lue4")).toBe("lüè");
  });
});
