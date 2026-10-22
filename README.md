# Wot-Git

**A full-stack repository exploration tool built around Git history.**

Wot-Git helps developers get oriented in an unfamiliar public GitHub repository. It combines bounded Git-history analysis with static repository checks, then links the results to the commits and files behind them. The goal is to help users decide what to inspect next—not to claim that a file is broken or a codebase is healthy.

## Project at a glance

| | |
|---|---|
| **Type** | Full-stack TypeScript monorepo |
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Recharts |
| **Backend** | Express, simple-git, Node.js |
| **Shared contract** | Workspace package with API and dashboard types |
| **Input** | Public GitHub repository URL or `owner/repo` |
| **Output** | Interactive analysis dashboard, Health report, CSV and Markdown exports |

## Why this project is interesting

Wot-Git is an exercise in turning imperfect repository metadata into a useful, inspectable workflow. The project brings together frontend product work and backend systems concerns:

- **Bounded repository processing:** shallow clone, commit/file caps, checkout-size monitoring, clone timeout, and a total scan deadline.
- **Cancellation and cleanup:** request disconnects propagate through the scan, Git processes can be aborted, and temporary checkouts are removed after processing.
- **Progress reporting:** the combined dashboard endpoint streams real scan stages to the UI using Server-Sent Events.
- **Shared API contracts:** frontend and backend consume the same TypeScript result models from the pnpm workspace.
- **Traceable signals:** file inspection connects summary metrics to the commits, dates, authors, and file changes that produced them.
- **Safe exports and rendering:** browser-side CSV generation escapes cells and protects spreadsheet formulas; README Markdown is rendered without raw HTML.
- **Tested edge cases:** parser tests cover unusual Git paths, truncated history, commit-size parsing, score normalization, secret redaction, symlink handling, and cancellation.

## What it analyzes

### Git history

- **Commit activity:** commits grouped by Git author date.
- **Commit size:** inserted and deleted line totals from Git numstat.
- **File churn:** number of included commits that touched a path and its latest observed date.
- **Hotspot:** mean of normalized change frequency and current file size in bytes, relative to files in the same scan.
- **Ownership:** Git author email identities per file and the most frequent recorded identity.
- **Co-change:** file pairs that appeared together in multiple commits.
- **Bug Files:** files changed in commits whose subject contains a whole-word match for `fix`, `bug`, `defect`, `error`, `issue`, `patch`, `repair`, `resolve`, `close`, or `crash`.
- **Outline:** regex-based function and class extraction for a limited set of languages.

### Static repository Health

Recognizes common README/documentation, test, CI, Docker, tracked environment-file, project-type, and credential-pattern signals. It does **not** install dependencies, execute tests, build the scanned project, or perform a complete security audit.

## How a dashboard scan works

```text
Browser (Next.js)
  └─ POST /dashboard/stream
       └─ Express API
            ├─ clone public GitHub repository to a temporary directory
            ├─ run Git-history analysis and static Health checks in parallel
            ├─ read the repository README for the Overview
            ├─ return typed results and stream progress stages
            └─ remove the temporary checkout
```

The combined dashboard uses one clone for its analysis, Health report, and README overview. The API also retains standalone endpoints for analysis and Health checks.

## Run locally

### Requirements

- Node.js; a supported version range is not currently declared in the project manifest
- pnpm 11.x
- Git available on `PATH`

### Start both apps

```bash
pnpm install
pnpm dev
```

- Web app: `http://localhost:3000`
- API: `http://localhost:3001`

The API port can be set with `PORT`. The web app uses `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:3001`.

Run an app separately:

```bash
pnpm dev:web
pnpm dev:api
```

### Build and verify

```bash
pnpm build
pnpm --filter @wot-git/api test
pnpm --filter @wot-git/api benchmark
```

The offline benchmark uses a small manually labeled fixture. Its numbers describe that fixture only; they are not general accuracy claims.

## API endpoints

Base URL for local development: `http://localhost:3001`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | API process status |
| `POST` | `/analyze` | Git-history analysis |
| `POST` | `/repo-health` | Static repository Health checks |
| `POST` | `/dashboard` | Combined analysis, Health, and README Overview |
| `POST` | `/dashboard/stream` | Combined dashboard with streamed progress |

Analysis requests use JSON:

```json
{
  "repoUrl": "https://github.com/expressjs/express"
}
```

Set `"refresh": true` in the request body to bypass the cache.

## Resource limits and coverage

Scans are intentionally bounded. A report can be partial when history or file-detail caps are reached; hard time or checkout-size limits can stop the request.

| Limit | Current value |
|---|---:|
| Clone timeout | 60 seconds |
| Total scan deadline | 3 minutes |
| Clone depth | 10,001 commits (one beyond the 10,000 analysis cap) |
| History commits analyzed | 10,000 |
| Temporary checkout size | 1 GiB |
| Distinct history paths | 10,000 |
| Included paths per commit | 100 |
| Authors retained per file | 100 |
| Co-change pairs | Up to 100,000 counted; 200 returned |
| Outline | 300 files; files over 500 KiB skipped |
| README display | 256 KiB |

The dashboard reports coverage flags when applicable. Consult [`apps/api/src/config/limits.ts`](apps/api/src/config/limits.ts) and [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for implementation details.

## Important limitations

- **Signals are not diagnoses.** Hotspots and repeated changes are leads for review, not proof of defects or risk.
- **Commit wording affects Bug Files.** Keyword matching can miss fixes or associate unrelated changes.
- **Health checks are static.** Detecting test files does not show that tests exist in another form, pass, or provide adequate coverage.
- **Secret scanning is limited.** It checks selected text/config files in the current revision for a small set of patterns. It can miss credentials or produce false positives; values are redacted, and historical file contents are not scanned.
- **History is bounded.** Older commits or file paths may be omitted when scan limits are reached. Renamed paths are not unified into a single historical identity.
- **Results are repository-specific.** Hotspot values are normalized against files in one scan and are not calibrated for cross-project ranking.
- **Only public GitHub repositories are supported.** The report does not include uncommitted local changes or automatically fetch submodule contents.

Use Wot-Git to choose what to inspect. Verify important findings against the actual commits, code, and project tests.

## Privacy and data handling

The API clones a public repository into a temporary directory, removes that checkout after processing, and caches results in process memory. The standalone `/analyze` result cache lives for up to 24 hours; Health and combined dashboard caches live for up to 6 hours. Cache contents disappear when the API process restarts. No user account or persistent repository database is implemented in this project snapshot.

Repository autocomplete suggestions are fetched by the browser from GitHub’s public repository search API. The submitted repository URL is sent to the Wot-Git API for analysis.

## Status and reuse

Wot-Git is under active development. It includes service tests, a small offline benchmark, and a production-buildable dashboard; broad predictive-accuracy claims have not been established.

**License:** no `LICENSE` file is currently included. The project owner intends to make the tool available for free, but the source reuse and redistribution terms have not yet been selected. Add a license before presenting the repository as open source or granting reuse rights.

## Feedback

Use the [GitHub issue tracker](https://github.com/KayHo412/Wot-Git/issues) to report problems or suggest improvements.
