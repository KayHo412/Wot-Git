# Wot-Git

**Turn an unfamiliar GitHub repository into a clear, actionable engineering brief.**

Wot-Git is a repository intelligence dashboard for engineering teams that need to understand a codebase quickly. It combines Git-history analysis with static repository checks to surface where activity is concentrated, how files have changed, who has worked on them, and what deserves attention next. Every signal is linked back to the commits and files behind it, so teams can move from a high-level overview to evidence in a few clicks.

## Installation

### Requirements

- Node.js `22.13.x` or a newer release in the Node.js 22 line
- pnpm `11.27.1` (the repository version is pinned in `package.json`)
- Git available on your `PATH`

### Run locally

Clone the repository, install dependencies, and start the web application and API together:

```bash
git clone https://github.com/KayHo412/Wot-Git.git
cd Wot-Git
corepack enable
corepack prepare pnpm@11.27.1 --activate
pnpm install
pnpm dev
```

Open the dashboard at [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:3001](http://localhost:3001).

To run either application independently:

```bash
pnpm dev:web
pnpm dev:api
```

The API port can be changed with `PORT`. The web application reads `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:3001`.

### Run with Docker Compose

For a containerized setup, install Docker Engine with the Docker Compose plugin and run:

```bash
docker compose up --build
```

The dashboard is available at [http://localhost:3000](http://localhost:3000), and the API health check is available at [http://localhost:3001/health](http://localhost:3001/health).

Stop the stack with `Ctrl+C` or:

```bash
docker compose down
```

When the dashboard is accessed from a different host, provide an API URL reachable by the browser and rebuild the web image:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com docker compose up --build
```

`NEXT_PUBLIC_API_URL` is compiled into the web image at build time. Do not use the Compose-only hostname `http://api:3001` unless the browser itself can resolve that hostname.

## Why teams use Wot-Git

Wot-Git helps engineering leaders, maintainers, and developers answer practical questions before investing time in a codebase:

- Where is development activity concentrated?
- Which files are changing repeatedly or growing in complexity?
- Which areas have a history of bug-fix commits?
- Who has contributed to the files that matter most?
- Does the repository show the expected documentation, testing, CI, and containerization signals?
- What should a reviewer or onboarding engineer inspect first?

Instead of presenting a black-box score, Wot-Git provides explainable signals and the underlying repository evidence. It is designed to accelerate technical due diligence, onboarding, maintenance planning, and engineering review.

## Product overview

| Capability | What it delivers |
|---|---|
| **Repository intelligence** | A unified view of Git history, file activity, ownership, and repository health |
| **Evidence-first analysis** | Links from summary metrics to commits, authors, dates, and changed files |
| **Progressive scanning** | Live scan stages through Server-Sent Events so users can see work in progress |
| **Actionable exports** | CSV and Markdown exports for sharing findings with technical and business stakeholders |
| **Bounded processing** | Explicit limits, timeouts, cancellation, and cleanup for predictable operation |
| **Shared contracts** | TypeScript models shared between the API and dashboard through the pnpm workspace |

## What it analyzes

### Git history

- **Commit activity:** commits grouped by Git author date.
- **Commit size:** inserted and deleted line totals from Git numstat.
- **File churn:** the number of included commits touching a path and its latest observed date.
- **Hotspots:** a relative score based on normalized change frequency and current file size.
- **Ownership:** author email identities per file and the most frequent recorded identity.
- **Co-change:** file pairs that appeared together in multiple commits.
- **Bug Files:** files changed in commits whose subject contains a whole-word match for common fix-related terms.
- **Outline:** regex-based function and class extraction for a limited set of languages.

### Repository health

Wot-Git identifies common README and documentation, test, CI, Docker, tracked environment-file, project-type, and credential-pattern signals. These checks are static: Wot-Git does not install dependencies, execute tests, build the scanned project, or perform a complete security audit.

## How a scan works

```text
Browser (Next.js)
  └─ POST /dashboard/stream
       └─ Express API
            ├─ clone a public GitHub repository to a temporary directory
            ├─ run Git-history analysis and static health checks in parallel
            ├─ read the repository README for the overview
            ├─ return typed results and stream progress stages
            └─ remove the temporary checkout
```

The combined dashboard uses one clone for its analysis, health report, and README overview. Standalone endpoints remain available for analysis and health checks.

## API

Base URL for local development: `http://localhost:3001`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | API process status |
| `POST` | `/analyze` | Git-history analysis |
| `POST` | `/repo-health` | Static repository health checks |
| `POST` | `/dashboard` | Combined analysis, health, and README overview |
| `POST` | `/dashboard/stream` | Combined dashboard with streamed progress |

Example request:

```json
{
  "repoUrl": "https://github.com/expressjs/express"
}
```

Set `"refresh": true` in the request body to bypass the cache.

## Build, test, and benchmark

Build both workspace applications:

```bash
pnpm build
```

Run the API and dashboard-focused test suite:

```bash
pnpm --filter @wot-git/api test
```

Run the offline benchmark:

```bash
pnpm --filter @wot-git/api benchmark
```

The benchmark uses a small manually labeled fixture. Its results describe that fixture only and are not general accuracy claims.

Build the production images without starting them:

```bash
docker build -f Dockerfile.api -t wot-git-api .
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t wot-git-web .
```

## Resource limits

Scans are intentionally bounded for predictable performance. Reports can be partial when history or file-detail caps are reached; hard time or checkout-size limits can stop a request.

| Limit | Current value |
|---|---:|
| Clone timeout | 60 seconds |
| Total scan deadline | 3 minutes |
| Clone depth | 10,001 commits |
| History commits analyzed | 10,000 |
| Temporary checkout size | 1 GiB |
| Distinct history paths | 10,000 |
| Included paths per commit | 100 |
| Authors retained per file | 100 |
| Co-change pairs | Up to 100,000 counted; 200 returned |
| Outline | 300 files; files over 500 KiB skipped |
| README display | 256 KiB |

See [`apps/api/src/config/limits.ts`](apps/api/src/config/limits.ts) and [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for implementation details.

## Important limitations

- **Signals are not diagnoses.** Hotspots and repeated changes are leads for review, not proof of defects or risk.
- **Commit wording affects Bug Files.** Keyword matching can miss fixes or associate unrelated changes.
- **Health checks are static.** Detecting test files does not show that tests exist in another form, pass, or provide adequate coverage.
- **Secret scanning is limited.** It checks selected text and configuration files in the current revision for a small set of patterns. Values are redacted, and historical file contents are not scanned.
- **History is bounded.** Older commits or paths may be omitted when scan limits are reached. Renamed paths are not unified into one historical identity.
- **Results are repository-specific.** Hotspot values are normalized against files in one scan and are not calibrated for cross-project ranking.
- **Public repositories only.** Wot-Git does not include uncommitted local changes or automatically fetch submodule contents.

Use Wot-Git to decide what to inspect. Verify important findings against the actual commits, code, and project tests.

## Privacy and data handling

The API clones a public repository into a temporary directory, removes that checkout after processing, and caches results in process memory. The standalone `/analyze` cache lives for up to 24 hours; health and combined dashboard caches live for up to 6 hours. Cache contents disappear when the API process restarts. No user account or persistent repository database is implemented in this project snapshot.

Repository autocomplete suggestions are fetched by the browser from GitHub's public repository search API. The submitted repository URL is sent to the Wot-Git API for analysis.

## Project status and reuse

Wot-Git is under active development. It includes service tests, an offline benchmark, and a production-buildable dashboard; broad predictive-accuracy claims have not been established.

No `LICENSE` file is currently included. Add a license before presenting the repository as open source or granting reuse rights.

## Feedback

Have a question, found an issue, or want to discuss a feature? Use the [GitHub issue tracker](https://github.com/KayHo412/Wot-Git/issues).
