import fs from "node:fs/promises";
import path from "node:path";
import { normalizeExternalEvidenceRecord } from "../schema.js";

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export const sampleExternalEvidenceProvider = {
  name: "sample-json",
  async loadRecords({ config, now = new Date() }) {
    const filePath = path.join(config.externalEvidenceDir, "sample-signals.json");
    const payload = await readJsonIfExists(filePath);
    return payload.map((item) => normalizeExternalEvidenceRecord(item, now));
  },
};
