import { extractGitHubRepos, parseReadme } from "./readme-parser.js";

export const STALE_AFTER_DAYS = 365;

export type RepoInfo = {
  fullName: string;
  archived: boolean;
  pushedAt: string;
};

export type FreshnessIssue = {
  repo: string;
  reason: string;
};

export function catalogRepos(readme: string): string[] {
  const parsed = parseReadme(readme);
  const cells = parsed.catalog.categories.flatMap((category) =>
    category.rows.flatMap((row) => row.columns),
  );

  return extractGitHubRepos(cells.join("\n"));
}

export function assessRepo(
  info: RepoInfo,
  now: Date,
  staleAfterDays: number = STALE_AFTER_DAYS,
): FreshnessIssue | null {
  if (info.archived) {
    return { repo: info.fullName, reason: "repository is archived" };
  }

  const pushedAt = new Date(info.pushedAt);
  const ageDays = Math.floor((now.getTime() - pushedAt.getTime()) / 86_400_000);

  if (ageDays > staleAfterDays) {
    return {
      repo: info.fullName,
      reason: `no push in ${ageDays} days (last push ${info.pushedAt.slice(0, 10)})`,
    };
  }

  return null;
}
