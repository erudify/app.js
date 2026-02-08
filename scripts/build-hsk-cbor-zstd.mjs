import { spawnSync } from "node:child_process";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { encode } from "cbor-x";
import YAML from "yaml";

const INPUT_PATH = "public/HSK-1.yml";
const TEMP_CBOR_PATH = "public/HSK-1.cbor";
const OUTPUT_PATH = "public/HSK-1.cbor.zstd";

/**
 * Convert a parsed YAML entry to the runtime exercise shape.
 * Unknown top-level fields are intentionally ignored.
 */
function toExercise(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const english = typeof entry.english === "string" ? entry.english.trim() : "";
  if (!english) {
    return null;
  }

  const chunks = Array.isArray(entry.chunks) ? entry.chunks : [];
  const segments = chunks
    .map((chunk) => {
      if (!chunk || typeof chunk !== "object") {
        return null;
      }

      const chinese = typeof chunk.chinese === "string" ? chunk.chinese : "";
      if (!chinese) {
        return null;
      }

      let pinyin = typeof chunk.pinyin === "string" ? chunk.pinyin : "";
      if (/^[.,!?;:，。？！：、]$/.test(pinyin)) {
        pinyin = "";
      }

      return {
        chinese,
        pinyin,
        transliteration:
          typeof chunk.transliteration === "string" ? chunk.transliteration : undefined,
      };
    })
    .filter(Boolean);

  return { english, segments };
}

async function main() {
  const yamlText = await readFile(INPUT_PATH, "utf8");
  const parsed = YAML.parse(yamlText);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${INPUT_PATH} to parse as a top-level list.`);
  }

  const exercises = parsed.map(toExercise).filter(Boolean);
  const cbor = encode(exercises);
  await writeFile(TEMP_CBOR_PATH, cbor);

  const zstd = spawnSync(
    "zstd",
    ["-f", "-q", "-19", TEMP_CBOR_PATH, "-o", OUTPUT_PATH],
    { stdio: "inherit" },
  );

  if (zstd.status !== 0) {
    throw new Error("zstd compression failed.");
  }

  await unlink(TEMP_CBOR_PATH);

  const inputStats = await stat(INPUT_PATH);
  const outputStats = await stat(OUTPUT_PATH);
  const ratio = (outputStats.size / inputStats.size).toFixed(3);
  console.log(`Wrote ${OUTPUT_PATH} (${outputStats.size} bytes, ratio ${ratio})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
