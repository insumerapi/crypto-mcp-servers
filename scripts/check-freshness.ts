import { readFile } from "node:fs/promises";

import { assessRepo, catalogRepos, type FreshnessIssue } from "../src/freshness.js";

const MAX_CONCURRENCY = 6;

async function fetchRepo(repo: string): Promise<Response> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "crypto-mcp-servers-freshness-check/1.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return fetch(`https://api.github.com/repos/${repo}`, { headers });
}

async function main(): Promise<void> {
  const filename = process.argv[2];

  if (!filename) {
    console.error("Usage: tsx scripts/check-freshness.ts <README.md>");
    process.exit(1);
  }

  const readme = await readFile(filename, "utf8");
  const repos = catalogRepos(readme);
  const issues: FreshnessIssue[] = [];
  const now = new Date();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < repos.length) {
      const repo = repos[index];
      index += 1;

      if (!repo) {
        return;
      }

      const response = await fetchRepo(repo);

      if (!response.ok) {
        const issue = { repo, reason: `GitHub API returned ${response.status}` };
        issues.push(issue);
        process.stdout.write(`FAIL ${repo}: ${issue.reason}\n`);
        continue;
      }

      const body = (await response.json()) as { full_name: string; archived: boolean; pushed_at: string };
      const issue = assessRepo(
        { fullName: body.full_name, archived: body.archived, pushedAt: body.pushed_at },
        now,
      );

      if (issue) {
        issues.push({ ...issue, repo });
        process.stdout.write(`FAIL ${repo}: ${issue.reason}\n`);
      } else {
        process.stdout.write(`OK   ${repo} (last push ${body.pushed_at.slice(0, 10)})\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, repos.length) }, () => worker()));

  if (issues.length > 0) {
    console.error("Freshness check failed:");
    for (const issue of issues) {
      console.error(`- ${issue.repo}: ${issue.reason}`);
    }
    process.exit(1);
  }

  console.log(`Checked ${repos.length} GitHub repositories from ${filename}`);
}

void main();
