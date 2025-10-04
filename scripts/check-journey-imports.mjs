import fs from "fs";
import path from "path";

const journeysDir = path.resolve(process.cwd(), "client/src/journeys");
const forbiddenImports = ["@aptos-labs/ts-sdk", "@/contexts/keyless-context"];

function getJourneyFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJourneyFiles(fullPath));
    } else if (entry.isFile() && /\.(t|j)sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  const violations = forbiddenImports.filter((pattern) => contents.includes(pattern));
  if (violations.length > 0) {
    return { filePath, violations };
  }
  return null;
}

function main() {
  if (!fs.existsSync(journeysDir)) {
    return;
  }

  const files = getJourneyFiles(journeysDir);
  const errors = files
    .map(checkFile)
    .filter((result) => result !== null);

  if (errors.length > 0) {
    console.error("Forbidden imports detected in journey modules:\n");
    errors.forEach(({ filePath, violations }) => {
      violations.forEach((pattern) => {
        console.error(` - ${filePath} imports disallowed module: ${pattern}`);
      });
    });
    process.exit(1);
  }
}

main();
