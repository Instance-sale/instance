import fs from "node:fs";
import path from "node:path";
import Groq from "groq-sdk";
import "dotenv/config";

interface TargetLanguage {
  code: string;
  name: string;
}

const TARGET_LANGUAGES: TargetLanguage[] = [
  { code: "pt", name: "Portuguese (Brazil)" },
  { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "id", name: "Indonesian" },
  { code: "tr", name: "Turkish" },
];

const LOCALES_DIR = path.resolve(__dirname, "../apps/web/locales");
const SOURCE_FILE = path.join(LOCALES_DIR, "en.json");

function getMissingKeys(
  source: Record<string, any>,
  target: Record<string, any>
): Record<string, any> | null {
  const missing: Record<string, any> = {};
  let hasMissing = false;

  for (const [key, value] of Object.entries(source)) {
    if (target[key] === undefined) {
      missing[key] = value;
      hasMissing = true;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (typeof target[key] === "object" && target[key] !== null) {
        const nestedMissing = getMissingKeys(value, target[key]);
        if (nestedMissing) {
          missing[key] = nestedMissing;
          hasMissing = true;
        }
      } else {
        missing[key] = value;
        hasMissing = true;
      }
    }
  }

  return hasMissing ? missing : null;
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      output[key] = deepMerge(target[key] || {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

async function main() {
  const isForce = process.argv.includes("--force");
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GROQ_API_KEY environment variable is missing.");
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Error: Source locale file not found at ${SOURCE_FILE}`);
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(SOURCE_FILE, "utf-8");
  const sourceJson = JSON.parse(sourceContent);

  const groq = new Groq({ apiKey });
  const modelName = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  console.log(`🌐 Checking translations using ${modelName} (force: ${isForce})...\n`);

  for (const lang of TARGET_LANGUAGES) {
    const targetFile = path.join(LOCALES_DIR, `${lang.code}.json`);
    let existingJson: Record<string, any> = {};

    if (fs.existsSync(targetFile)) {
      try {
        existingJson = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
      } catch {
        existingJson = {};
      }
    }

    const payloadToTranslate = isForce ? sourceJson : getMissingKeys(sourceJson, existingJson);

    if (!payloadToTranslate) {
      console.log(`⏩ ${lang.name} (${lang.code}) is up to date. Skipping.`);
      continue;
    }

    console.log(`⏳ Translating changes into ${lang.name} (${lang.code})...`);

    try {
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are an expert SaaS localization translator. Translate UI strings into ${lang.name} for an Instagram DM automation, CRM, and scheduler platform named "Instance".
Rules:
1. Maintain the exact same JSON keys, nested structure, placeholders, and formatting.
2. Translate only the values.
3. Keep the brand name "Instance" untranslated.
4. Keep technical and standard UI terms natural and idiomatic for ${lang.name}.
5. Return ONLY a valid JSON object matching the input structure.`,
          },
          {
            role: "user",
            content: `Translate the following JSON object to ${lang.name}:\n\n${JSON.stringify(payloadToTranslate, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        throw new Error("Empty response received from Groq.");
      }

      let translatedChunk = JSON.parse(raw);
      if (translatedChunk["0"] && typeof translatedChunk["0"] === "object" && !translatedChunk.navigation) {
        translatedChunk = translatedChunk["0"];
      }
      const merged = isForce ? translatedChunk : deepMerge(existingJson, translatedChunk);

      fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2) + "\n", "utf-8");
      console.log(`✅ Saved ${lang.code}.json successfully.`);
    } catch (err: any) {
      console.error(`❌ Failed to translate ${lang.code}:`, err?.message || err);
    }
  }

  console.log("\n✨ Translation check complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
