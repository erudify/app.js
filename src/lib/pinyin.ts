// Mapping of vowels to their toned versions
// Index 0 = no tone, 1-4 = tones 1-4
export const toneMap: Record<string, string[]> = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
  v: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"], // v is commonly used as ü substitute
};

// All toned vowels mapped back to their base form and tone number
export const tonedVowelMap: Record<string, { base: string; tone: number }> = {};
for (const [base, tones] of Object.entries(toneMap)) {
  for (let tone = 1; tone <= 4; tone++) { // Start from 1, not 0
    const toned = tones[tone];
    tonedVowelMap[toned] = { base: base === "v" ? "ü" : base, tone };
  }
}

// Get the base vowel from a potentially toned vowel
export function getBaseVowel(char: string): string {
  const info = tonedVowelMap[char];
  if (info) return info.base;
  if (toneMap[char]) return char === "v" ? "ü" : char;
  return char;
}

// Check if a character is a vowel (base or toned)
export function isVowel(char: string): boolean {
  return !!toneMap[char] || !!tonedVowelMap[char];
}

// Check if a character is a pinyin letter (consonant or vowel, including toned)
export function isPinyinChar(char: string): boolean {
  return /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(char);
}

// Find which vowel in a syllable should receive the tone mark
// Rules: 1) a or e always gets the tone
//        2) ou -> o gets the tone
//        3) otherwise, the last vowel gets the tone
export function findToneVowelIndex(syllable: string): number {
  let lastVowelIndex = -1;
  let hasA = -1;
  let hasE = -1;
  let hasOU = false;
  let oIndex = -1;

  for (let i = 0; i < syllable.length; i++) {
    const char = syllable[i].toLowerCase();
    const base = getBaseVowel(char);

    if (isVowel(char)) {
      lastVowelIndex = i;
      if (base === "a") hasA = i;
      if (base === "e") hasE = i;
      if (base === "o") oIndex = i;
      if (base === "u" && oIndex === i - 1) hasOU = true;
    }
  }

  // Rule 1: a or e gets the tone
  if (hasA !== -1) return hasA;
  if (hasE !== -1) return hasE;

  // Rule 2: in "ou", o gets the tone
  if (hasOU && oIndex !== -1) return oIndex;

  // Rule 3: last vowel gets the tone
  return lastVowelIndex;
}

// Apply a tone to a syllable
export function applyToneToSyllable(syllable: string, tone: number): string {
  const toneIndex = findToneVowelIndex(syllable);
  if (toneIndex === -1) return syllable;

  const chars = [...syllable];
  const char = chars[toneIndex];
  const base = getBaseVowel(char.toLowerCase());
  const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();

  const tones = toneMap[base];
  if (!tones) return syllable;

  let newChar = tones[tone];
  if (isUpper) {
    newChar = newChar.toUpperCase();
  }

  chars[toneIndex] = newChar;
  return chars.join("");
}

// Remove the most recent tone mark from a string (searching backwards)
export function removeLastTone(text: string): string {
  const chars = [...text];

  // Search backwards for the last toned vowel
  for (let i = chars.length - 1; i >= 0; i--) {
    const info = tonedVowelMap[chars[i]];
    if (info) {
      // Found a toned vowel, replace with base
      chars[i] = info.base;
      return chars.join("");
    }
    // Also check uppercase
    const infoLower = tonedVowelMap[chars[i].toLowerCase()];
    if (infoLower) {
      chars[i] = infoLower.base.toUpperCase();
      return chars.join("");
    }
  }

  return text;
}

// Check if a vowel is already toned
function isTonedVowel(char: string): boolean {
  return !!tonedVowelMap[char] || !!tonedVowelMap[char.toLowerCase()];
}

// Remove all tone marks from a syllable
function removeToneFromSyllable(syllable: string): string {
  const chars = [...syllable];
  for (let i = 0; i < chars.length; i++) {
    const info = tonedVowelMap[chars[i]];
    if (info) {
      chars[i] = info.base;
    } else {
      const infoLower = tonedVowelMap[chars[i].toLowerCase()];
      if (infoLower) {
        chars[i] = infoLower.base.toUpperCase();
      }
    }
  }
  return chars.join("");
}

// Parse a syllable starting at position i, return the end position
function parseSyllableEnd(sequence: string, startPos: number): number {
  let i = startPos;

  // Track the initial consonant(s)
  const consonantStart = i;
  
  // Skip leading consonants
  while (i < sequence.length && !isVowel(sequence[i])) {
    i++;
  }

  if (i >= sequence.length) {
    return i;
  }

  const initialConsonant = sequence.slice(consonantStart, i).toLowerCase();

  // Collect vowels
  const vowelStart = i;
  while (i < sequence.length && isVowel(sequence[i])) {
    // Special rule: after 'n' + 'ü', don't continue to 'e' (nü|e, not nüe)
    // But after 'l' + 'ü', DO continue to 'e' (lüe is valid)
    if (i > vowelStart) {
      const prevChar = sequence[i - 1].toLowerCase();
      const currChar = sequence[i].toLowerCase();
      
      if (getBaseVowel(prevChar) === "ü" && currChar === "e") {
        // Check what consonant precedes ü
        if (initialConsonant === "n") {
          // nü + e = two syllables (nü|e)
          break;
        }
        // For 'l' or other consonants, lüe is valid, so continue
      }
    }
    i++;
  }

  // Check for 'n' or 'ng' or 'r' as syllable finals
  if (i < sequence.length) {
    if (sequence[i] === "n" || sequence[i] === "N") {
      if (
        i + 1 < sequence.length &&
        (sequence[i + 1] === "g" || sequence[i + 1] === "G")
      ) {
        // 'ng' - check if 'g' starts next syllable
        if (i + 2 < sequence.length && isVowel(sequence[i + 2])) {
          i++; // just 'n' is final
        } else {
          i += 2; // 'ng' is final
        }
      } else if (i + 1 < sequence.length && isVowel(sequence[i + 1])) {
        // 'n' is initial of next syllable
      } else {
        i++; // 'n' is final
      }
    } else if (sequence[i] === "r" || sequence[i] === "R") {
      if (i + 1 >= sequence.length || !isVowel(sequence[i + 1])) {
        i++; // 'r' is final
      }
    }
  }

  return i;
}

// Check if a syllable (substring) has a tone
function syllableHasTone(syllable: string): boolean {
  for (const char of syllable) {
    if (isTonedVowel(char)) {
      return true;
    }
  }
  return false;
}

// Find the first untoned vowel group in a pinyin sequence
// Scans left to right to find the first vowel cluster without a tone mark
// If all syllables have tones, returns the last syllable (for replacement)
export function findFirstUntonedSyllable(
  text: string,
  cursorPos: number
): { start: number; end: number; syllable: string; replacing: boolean } {
  // First, find the start of the pinyin sequence (going backwards from cursor)
  let seqStart = cursorPos;
  while (seqStart > 0 && isPinyinChar(text[seqStart - 1])) {
    seqStart--;
  }

  const sequence = text.slice(seqStart, cursorPos);

  // Collect all syllables
  const syllables: { start: number; end: number; syllable: string }[] = [];

  let i = 0;
  while (i < sequence.length) {
    const syllableStart = i;

    // Skip leading consonants
    while (i < sequence.length && !isVowel(sequence[i])) {
      i++;
    }

    if (i >= sequence.length) {
      break;
    }

    const syllableEnd = parseSyllableEnd(sequence, syllableStart);
    const syllable = sequence.slice(syllableStart, syllableEnd);
    i = syllableEnd;

    syllables.push({
      start: seqStart + syllableStart,
      end: seqStart + syllableEnd,
      syllable,
    });
  }

  // First pass: find an untoned syllable
  for (const syl of syllables) {
    if (!syllableHasTone(syl.syllable)) {
      return { ...syl, replacing: false };
    }
  }

  // All syllables are toned - return the last syllable for replacement
  // This matches the user's expectation: new tones replace the most recently typed syllable
  if (syllables.length > 0) {
    return { ...syllables[syllables.length - 1], replacing: true };
  }

  // No syllables at all
  return {
    start: cursorPos,
    end: cursorPos,
    syllable: "",
    replacing: false,
  };
}

// Process pinyin input - apply tone when a number 1-4 is typed
export function processPinyinInput(
  text: string,
  cursorPos: number,
  toneNumber: number
): { newText: string; newCursorPos: number } {
  if (toneNumber === 0) {
    // Remove the last tone mark
    const newText =
      removeLastTone(text.slice(0, cursorPos)) + text.slice(cursorPos);
    return { newText, newCursorPos: cursorPos };
  }

  const { start, end, syllable, replacing } = findFirstUntonedSyllable(
    text,
    cursorPos
  );

  if (!syllable) {
    return { newText: text, newCursorPos: cursorPos };
  }

  // If replacing an existing tone, first remove the old tone
  const baseSyllable = replacing ? removeToneFromSyllable(syllable) : syllable;
  const tonedSyllable = applyToneToSyllable(baseSyllable, toneNumber);
  const newText = text.slice(0, start) + tonedSyllable + text.slice(end);

  // Cursor position adjusts based on how much text changed
  const lengthDiff = tonedSyllable.length - syllable.length;
  const newCursorPos = cursorPos + lengthDiff;

  return { newText, newCursorPos };
}

// Helper to simulate typing a sequence of characters including tone numbers
export function simulateTyping(input: string): string {
  let text = "";
  let cursorPos = 0;

  for (const char of input) {
    if (/^[0-4]$/.test(char)) {
      // It's a tone number
      const result = processPinyinInput(text, cursorPos, parseInt(char, 10));
      text = result.newText;
      cursorPos = result.newCursorPos;
    } else {
      // Regular character - insert at cursor
      text = text.slice(0, cursorPos) + char + text.slice(cursorPos);
      cursorPos++;

      // Auto-convert 'v' to 'ü' after insertion
      if (char === "v" || char === "V") {
        const isUpper = char === "V";
        text =
          text.slice(0, cursorPos - 1) +
          (isUpper ? "Ü" : "ü") +
          text.slice(cursorPos);
      }

      // Handle 'nue' and 'lue' conversion to 'nüe' and 'lüe'
      // After typing 'e', check if preceded by 'nu' or 'lu' and convert 'u' to 'ü'
      if (char === "e" || char === "E") {
        if (cursorPos >= 3) {
          const prevTwo = text.slice(cursorPos - 3, cursorPos - 1).toLowerCase();
          const consonant = text[cursorPos - 3];
          const vowel = text[cursorPos - 2];
          
          if ((prevTwo === "nu" || prevTwo === "lu") && 
              (consonant === "n" || consonant === "N" || consonant === "l" || consonant === "L")) {
            // Convert 'u' to 'ü'
            const isUpperU = vowel === vowel.toUpperCase();
            text =
              text.slice(0, cursorPos - 2) +
              (isUpperU ? "Ü" : "ü") +
              text.slice(cursorPos - 1);
          }
        }
      }
    }
  }

  return text;
}

// Normalize pinyin for comparison (lowercase, remove spaces)
export function normalizePinyin(pinyin: string): string {
  return pinyin.toLowerCase().replace(/\s+/g, "");
}
