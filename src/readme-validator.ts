import { parseReadme, REQUIRED_CATEGORIES, type ReadmeRow } from "./readme-parser.js";

const REQUIRED_SECTIONS = [
  "Quick Index",
  "Quick Start",
  "Try Without a Key",
  "Server Categories",
  "Safety Checklist",
  "Resources",
  "Methodology",
  "Contributing",
] as const;

const ALLOWED_MAINTAINER_VALUES = new Set(["Official", "Community"]);
const ALLOWED_TRANSPORT_VALUES = new Set(["Remote", "Local", "Both"]);
const ALLOWED_AUTH_VALUES = new Set(["No", "apiKey", "OAuth", "Wallet", "Mixed"]);

function normalizeCode(value: string): string {
  return value.replaceAll("`", "").trim();
}

function hasMarkdownHttpsLink(value: string): boolean {
  return /\[[^\]]+\]\(https:\/\/[^)]+\)/.test(value);
}

function compareNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function validateRows(rows: ReadmeRow[], issues: string[]): void {
  for (const row of rows) {
    const [serverCell, description, maintainer, transport, auth, sourceCell] = row.columns;

    if (!serverCell || !description || !maintainer || !transport || !auth || !sourceCell) {
      issues.push(`Incomplete row for server: ${row.serverName}`);
      continue;
    }

    if (!ALLOWED_MAINTAINER_VALUES.has(normalizeCode(maintainer))) {
      issues.push(`Invalid Maintainer value \`${normalizeCode(maintainer)}\` for server: ${row.serverName}`);
    }

    if (!ALLOWED_TRANSPORT_VALUES.has(normalizeCode(transport))) {
      issues.push(`Invalid Transport value \`${normalizeCode(transport)}\` for server: ${row.serverName}`);
    }

    if (!ALLOWED_AUTH_VALUES.has(normalizeCode(auth))) {
      issues.push(`Invalid Auth value \`${normalizeCode(auth)}\` for server: ${row.serverName}`);
    }

    if (!hasMarkdownHttpsLink(serverCell)) {
      issues.push(`Server cell must contain an https link for server: ${row.serverName}`);
    }

    if (!hasMarkdownHttpsLink(sourceCell)) {
      issues.push(`Source cell must contain an https link for server: ${row.serverName}`);
    }
  }
}

export function validateReadme(readme: string): string[] {
  const parsed = parseReadme(readme);
  const issues: string[] = [];

  if (parsed.title !== "Crypto MCP Servers") {
    issues.push("README title must be `# Crypto MCP Servers`.");
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!parsed.sections.has(section)) {
      issues.push(`Missing required section: ${section}`);
    }
  }

  const catalogCategoryNames = parsed.catalog.categories.map((category) => category.name);

  for (const category of REQUIRED_CATEGORIES) {
    if (!catalogCategoryNames.includes(category)) {
      issues.push(`Missing category: ${category}`);
    }
  }

  for (const category of parsed.catalog.categories) {
    for (const malformedRow of category.malformedRows) {
      issues.push(`Malformed row in ${category.name}: expected 6 columns in \`${malformedRow}\``);
    }

    validateRows(category.rows, issues);

    for (let index = 1; index < category.rows.length; index += 1) {
      const previous = category.rows[index - 1];
      const current = category.rows[index];

      if (!previous || !current) {
        continue;
      }

      if (compareNames(previous.serverName, current.serverName) > 0) {
        issues.push(
          `Category must be alphabetical: ${category.name} has \`${previous.serverName}\` before \`${current.serverName}\``,
        );
      }
    }

    const seen = new Set<string>();

    for (const row of category.rows) {
      if (seen.has(row.serverName)) {
        issues.push(`Duplicate server in category ${category.name}: ${row.serverName}`);
      } else {
        seen.add(row.serverName);
      }
    }
  }

  return issues;
}
