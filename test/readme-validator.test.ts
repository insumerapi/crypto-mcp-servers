import test from "node:test";
import assert from "node:assert/strict";

import { assessRepo, catalogRepos } from "../src/freshness.js";
import { parseReadme, REQUIRED_CATEGORIES } from "../src/readme-parser.js";
import { validateReadme } from "../src/readme-validator.js";

const HEADER = "| Server | What It Is Good For | Maintainer | Transport | Auth | Source |\n|---|---|---|---|---|---|";

function row(name: string, overrides: Partial<Record<"maintainer" | "transport" | "auth", string>> = {}): string {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  return `| [${name}](https://${slug}.test/docs) | Does useful things | \`${overrides.maintainer ?? "Official"}\` | \`${overrides.transport ?? "Remote"}\` | \`${overrides.auth ?? "apiKey"}\` | [GitHub](https://github.com/example/${slug}) |`;
}

function category(name: string, rows: string[]): string {
  return `### ${name}\n${HEADER}\n${rows.join("\n")}\n`;
}

const validReadme = `# Crypto MCP Servers

> Curated crypto MCP servers.

## Quick Index

- [Server Categories](#server-categories)

## Quick Start

Add a remote server to your client.

## Try Without a Key

| Server | Endpoint | What You Get |
|---|---|---|
| [Keyless](https://keyless.test) | \`https://keyless.test/mcp\` | Public data |

## Server Categories

${REQUIRED_CATEGORIES.map((name, index) => category(name, [row(`Server ${String.fromCharCode(65 + index)}`)])).join("\n")}
## Safety Checklist

- Start read-only.

## Resources

- [Stale list](https://github.com/someone/old-list)

## Methodology

Only maintained servers are included.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
`;

const firstRow = row("Server A");

test("parseReadme collects every category", () => {
  const parsed = parseReadme(validReadme);

  assert.equal(parsed.title, "Crypto MCP Servers");
  assert.equal(parsed.catalog.categories.length, REQUIRED_CATEGORIES.length);
  assert.equal(parsed.catalog.categories[0]?.rows[0]?.serverName, "Server A");
});

test("validateReadme accepts a valid README structure", () => {
  assert.deepEqual(validateReadme(validReadme), []);
});

test("validateReadme reports a missing category", () => {
  const readme = validReadme.replace(category("DeFi", [row("Server F")]), "");

  assert.ok(validateReadme(readme).includes("Missing category: DeFi"));
});

test("validateReadme rejects duplicate servers in the same category", () => {
  const readme = validReadme.replace(firstRow, `${firstRow}\n${firstRow}`);

  assert.ok(validateReadme(readme).some((issue) => issue.includes("Duplicate server in category Market Data: Server A")));
});

test("validateReadme allows the same server in multiple categories", () => {
  const readme = validReadme.replace(row("Server B"), `${row("Server A")}\n${row("Server B")}`);

  assert.ok(!validateReadme(readme).some((issue) => issue.includes("Duplicate server")));
});

test("validateReadme rejects categories that are not alphabetical", () => {
  const readme = validReadme.replace(firstRow, `${row("Zulu")}\n${firstRow}`);

  assert.ok(
    validateReadme(readme).some((issue) =>
      issue.includes("Category must be alphabetical: Market Data has `Zulu` before `Server A`"),
    ),
  );
});

test("validateReadme rejects invalid maintainer, transport, and auth values", () => {
  const readme = validReadme.replace(
    firstRow,
    row("Server A", { maintainer: "Vendor", transport: "HTTP", auth: "Token" }),
  );
  const issues = validateReadme(readme);

  assert.ok(issues.includes("Invalid Maintainer value `Vendor` for server: Server A"));
  assert.ok(issues.includes("Invalid Transport value `HTTP` for server: Server A"));
  assert.ok(issues.includes("Invalid Auth value `Token` for server: Server A"));
});

test("validateReadme accepts Wallet auth for signing servers", () => {
  const readme = validReadme.replace(firstRow, row("Server A", { auth: "Wallet", transport: "Local" }));

  assert.deepEqual(validateReadme(readme), []);
});

test("validateReadme reports a malformed row instead of skipping it", () => {
  const readme = validReadme.replace(firstRow, "| [Server A](https://a.test) | Too few | `Official` | `Remote` | `apiKey` |");

  assert.ok(validateReadme(readme).some((issue) => issue.startsWith("Malformed row in Market Data: expected 6 columns")));
});

test("parseReadme accepts short and aligned delimiter rows", () => {
  const readme = validReadme.replace("|---|---|---|---|---|---|", "|:-|:-:|-|-:|-|-|");

  assert.deepEqual(parseReadme(readme).catalog.categories[0]?.malformedRows, []);
});

test("catalogRepos reads only catalog rows, not resources", () => {
  const repos = catalogRepos(validReadme);

  assert.ok(repos.includes("example/server-a"));
  assert.ok(!repos.includes("someone/old-list"));
  assert.equal(repos.length, REQUIRED_CATEGORIES.length);
});

test("catalogRepos normalizes monorepo subfolder links to the repository", () => {
  const readme = validReadme.replace(
    "https://github.com/example/server-a",
    "https://github.com/example/monorepo/tree/main/packages/mcp",
  );

  assert.ok(catalogRepos(readme).includes("example/monorepo"));
});

test("assessRepo flags archived and inactive repositories", () => {
  const now = new Date("2026-10-14T00:00:00Z");

  assert.equal(assessRepo({ fullName: "a/b", archived: false, pushedAt: "2026-09-01T00:00:00Z" }, now), null);
  assert.equal(
    assessRepo({ fullName: "a/b", archived: true, pushedAt: "2026-09-01T00:00:00Z" }, now)?.reason,
    "repository is archived",
  );
  assert.match(
    assessRepo({ fullName: "a/b", archived: false, pushedAt: "2025-03-27T00:00:00Z" }, now)?.reason ?? "",
    /^no push in \d+ days \(last push 2025-03-27\)$/,
  );
});
