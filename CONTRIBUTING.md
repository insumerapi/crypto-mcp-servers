# Contributing to Crypto MCP Servers

This list is for people connecting crypto tools to AI agents. It stays useful only if every entry is real, current, and described accurately.

Pull requests that add unmaintained servers, docs-only servers, or marketing copy will be closed.

## Inclusion Standard

A server is eligible only if all of these are true:

- It is an MCP server. Agent skills, plain CLIs, SDKs without an MCP mode, and servers that only search documentation do not qualify.
- Its maintainer documents it, in a README or official docs page.
- Its repository was pushed within the last 12 months and is not archived, **or** it is an official hosted server whose docs are current and whose endpoint responds.
- It does something crypto-specific: market data, trading, wallets, on-chain data, DeFi, research, news, security, or payments.

Prefer the official server when the provider publishes one. A community server for the same provider is accepted only if it does something the official one does not, or if it is far better adopted.

## Entry Format

Each row uses this format:

| Server | What It Is Good For | Maintainer | Transport | Auth | Source |
| --- | --- | --- | --- | --- | --- |
| [Server Name](https://example.com/docs) | Short summary of what an agent can do with it | `Official` | `Remote` | `OAuth` | [GitHub](https://github.com/example/server) |

- **Server** links to the best page for getting started: the official docs page for hosted servers, otherwise the repository.
- **Source** links to the GitHub repository (use the subfolder URL for monorepos) or, for hosted servers without public source, `[Docs](...)`.
- Keep descriptions short and specific. No pipes (`|`) inside cells.

## Allowed Values

**Maintainer**

- `Official` - published by the company behind the product or data source
- `Community` - independent project

**Transport**

- `Remote` - hosted URL (Streamable HTTP or SSE)
- `Local` - runs on the user's machine (stdio, `npx`, `uvx`, Docker)
- `Both`

**Auth**

- `No` - no credentials needed
- `apiKey` - provider API key
- `OAuth` - browser sign-in
- `Wallet` - needs a private key, seed phrase, or wallet connection
- `Mixed` - more than one mode, such as keyless public tools plus a key or OAuth for the rest

## Required Rules

- Use official documentation or the maintainer's repository as the source, never blog round-ups or directories.
- Keep servers in alphabetical order within each category.
- A server can appear in several categories when it genuinely fits each one, but only once per category.
- Only add a server to **Try Without a Key** after a credential-free MCP `initialize` request to its endpoint succeeds.
- Use one server addition or one focused cleanup per pull request.

## Validation

```bash
npm ci
npm test
npm run validate:readme
npm run validate:links
GITHUB_TOKEN=... npm run check:freshness
```

`check:freshness` fails when a listed repository is archived, missing, or has had no push for more than 365 days. It also runs weekly in CI and opens a tracking issue.

Thanks for helping keep the list current.
