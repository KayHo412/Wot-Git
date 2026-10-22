# Wot-Git Technical Handoff

> **Evidence convention.** Statements are tagged as `[CODE]` (current implementation), `[DOC]` (repository document), `[COMMIT]` (Git history), or `[INFERRED]` (interpretation). Code evidence cites a repository path and function/component or configuration key. `[QUOTE]` blocks reproduce exact code. When an implementation detail could not be verified, it is marked `NOT FOUND` or `UNSURE`.
>
> **Snapshot and scope.** This document describes the checkout inspected on 2026-10-22. At inspection time, the working tree had uncommitted changes affecting CSV exports, dashboard exploration helpers, commit keyword metadata, and related tests. This is therefore a snapshot of the working tree, not only of `HEAD`. [CODE] `git status --short`; [INFERRED] see Section 10 for the committed history boundary.

## 1. PURPOSE AND SCOPE

### What it does

- [CODE] Wot-Git accepts a public GitHub repository URL and presents Git-history signals and static repository checks in a browser dashboard. Inputs are submitted by the landing-page repository field and API JSON `repoUrl`; outputs are `AnalysisResult`, `RepoHealthResult`, or the combined `DashboardResult`. See `apps/web/app/page.tsx`, `apps/api/src/routes/analyze.ts`, `apps/api/src/routes/dashboard.ts`, `apps/api/src/services/analysis.ts`, and `packages/types/index.ts`.
- [CODE] The existing analysis includes daily commit counts, per-commit line-change totals, per-file change counts and last-touched date, relative hotspot scores, Git author identities, co-change pairs, source outline extraction, structured commit history, and files appearing in keyword-matched commits. See `apps/api/src/services/analysis.ts` and services it invokes.
- [CODE] The Health scan checks recognized README/docs/test/CI/Docker/environment-file signals, a limited set of credential patterns in selected current-revision text files, project-type heuristics, repeated-change signals, and a reconstructed monthly timeline. It does not execute repository tests or scripts. See `apps/api/src/services/repoHealth.ts` (`runRepoHealth`, `getSignals`, `scanCurrentSecrets`).
- [CODE] The dashboard also provides repository Overview and README rendering, file evidence, filters, activity comparison, contributor drill-down, and browser-generated Markdown/CSV exports. See `apps/web/app/r/[owner]/[repo]/page.tsx`, `apps/web/components/panels/RepositoryOverview.tsx`, `FileEvidencePanel.tsx`, `CommitActivity.tsx`, and `apps/web/lib/dashboardExploration.ts`.
- [DOC] The landing-page text says “Analyze any public GitHub repository — hotspots, churn, bugs, and ownership.” `apps/web/app/page.tsx`.
- [INFERRED] Likely users include developers entering an unfamiliar repository, maintainers looking for historical activity patterns, and students examining Git-history metrics. The code does not define a formal user persona.

### Scope limits and current state

- [CODE] The API validator accepts only URLs whose parsed hostname is exactly `github.com` and whose path has at least two non-empty segments. Private or missing repositories map to a `REPO_NOT_FOUND` error. See `apps/api/src/routes/analyze.ts` (`isValidGithubUrl`) and corresponding helpers in the other routers.
- [CODE] Scanning is static and metadata-oriented except for bounded reads of current checkout files for README content, byte sizes, project manifests, and secret patterns. No test command or build command from the scanned repository is executed. See `apps/api/src/services/repoHealth.ts`, `repositoryOverview.ts`, and `hotspot.ts`.
- [CODE] Metrics are bounded and some are explicitly marked partial; a timeout or checkout-size limit can instead reject the scan. See `apps/api/src/config/limits.ts`, `apps/api/src/utils/git.ts`, and the `scan` metadata in `packages/types/index.ts`.
- [CODE] The current test suite exercises service calculations, parsers, static Health behavior, cancellation, and client-side exploration helpers. It does not test the Express routers over HTTP or automate browser interactions. See Section 9.
- [CODE] At inspection, the API tests and web production build passed (25 tests; build successful). The fixture benchmark ran successfully. These results are recorded in Section 9.
- [DOC] At the time of the source inventory for this handoff, no root README or formal product requirements document was present. An image-free root README was added afterward; `APIcmd.md` remains and includes claims that no longer match parts of the implementation. Mismatches are called out below.

## 2. ARCHITECTURE

### Directory tree (to three levels)

```text
.
├── APIcmd.md
├── README.md
├── apps
│   ├── api
│   │   ├── benchmarks
│   │   └── src
│   │       ├── config
│   │       ├── middleware
│   │       ├── routes
│   │       ├── services
│   │       └── utils
│   └── web
│       ├── app
│       │   ├── guide
│       │   └── r/[owner]/[repo]
│       ├── components
│       │   ├── guide
│       │   ├── layout
│       │   ├── panels
│       │   ├── shared
│       │   └── ui
│       ├── hooks
│       └── lib
├── docs
│   └── PROJECT_CONTEXT.md
├── packages
│   └── types
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.json
```

- [CODE] Workspace packages are `apps/api`, `apps/web`, and `packages/types`; the root pnpm workspace includes `apps/*` and `packages/*`. `pnpm-workspace.yaml`; package manifests in those directories.
- [CODE] `packages/types/index.ts` exports TypeScript contracts consumed as `@wot-git/types` by API and web. The workspace dependency is declared in both app manifests.
- [INFERRED] A shared package reduces frontend/backend schema drift, but a rationale is not stated in the current source or checked-in planning document; **reason not documented**.

### Stack and versions

| Area | Current evidence |
|---|---|
| Runtime | [CODE] The API uses Node built-ins and TypeScript. `apps/api/package.json` has no `engines` field. [INFERRED] A supported Node range is therefore not declared. The inspected machine reported Node `v24.7.0`; this is environment state, not a project requirement. |
| Language | [CODE] TypeScript compiler dependency is `^5.4.0` at root and in apps. Root `tsconfig.json` enables `strict`. |
| Package manager | [CODE] pnpm workspace; root dependency declares `pnpm: ^11.27.1`, `pnpm-lock.yaml` exists, and local pnpm version observed was `11.27.1`. |
| API | [CODE] Express `^4.19.2`, `simple-git ^3.25.0`, `node-cache ^5.1.2`, `cors ^2.8.5`; API package `@wot-git/api@0.0.1`. `apps/api/package.json`. |
| Web | [CODE] Next.js `14.2.4`, React/React DOM `^18.3.1`, Tailwind CSS `^3.4.4`, Recharts `^2.12.7`, TanStack Query `^5.40.0`, TanStack Table `^8.17.3`, lucide-react `^0.395.0`. `apps/web/package.json`. |
| Tests | [CODE] Node built-in test runner launched with `node --import tsx --test`; `tsx ^4.8.2`. API manifest `test` script. |
| Lint | [CODE] API script is `eslint src`; web script is `next lint`. Root has `pnpm -r lint`. No lint result was run for this handoff. |

Exact dependency counts from direct `dependencies` / `devDependencies` in package manifests: [CODE] API 5 / 5, web 11 / 6, types 0 / 0, root 1 / 1. These counts include the workspace type dependency and exclude transitive dependencies. Root manifest and app manifests.

### Component and request flow

```mermaid
flowchart LR
  U[Browser user] --> W[Next.js web app :3000]
  W -->|JSON POST /dashboard/stream| A[Express API :3001]
  W -->|GitHub public repository search suggestions| GH[GitHub search API]
  A -->|spawn git clone; bounded temp checkout| G[GitHub repository]
  A --> S[Analysis and Health services]
  S --> T[@wot-git/types contracts]
  A -->|DashboardResult / SSE stages| W
  W -->|rendered views and browser-side CSV/Markdown| U
```

- [CODE] API port is `process.env.PORT || 3001`; web dev script is `next dev --port 3000`. `apps/api/src/index.ts`, `apps/web/package.json`.
- [CODE] The landing page accepts a repo URL or `owner/repo`, retrieves autocomplete suggestions from GitHub’s public search API in browser code, then routes to `/r/[owner]/[repo]`. `apps/web/app/page.tsx`.
- [CODE] The dashboard page invokes the streaming dashboard hook, displays stage progress, then renders a selected dashboard view from the combined result. `apps/web/app/r/[owner]/[repo]/page.tsx`, `apps/web/hooks/useDashboard.ts`.
- [CODE] API dashboard path validates the URL, checks an in-memory cache, clones once into a temporary directory, runs analysis and Health in parallel, reads README overview, caches the result, and removes the clone in `finally`. `apps/api/src/routes/dashboard.ts` (`createDashboardResult`, `/stream`).
- [CODE] SSE messages are `stage`, `cache`, `complete`, or `error`; a keep-alive comment is written every 15 seconds. `apps/api/src/routes/dashboard.ts` (`writeStreamMessage`, `/stream`).
- [CODE] On a successful dashboard result, the web provides Overview first, grouped navigation, analysis/Health views, Guide, file inspection, filters, and exports. `apps/web/components/layout/Sidebar.tsx`, `apps/web/app/r/[owner]/[repo]/page.tsx`.

### Deployment and configuration

- [CODE] `PORT` is the only environment variable read in application code found by search. `apps/api/src/index.ts`.
- [CODE] `NEXT_PUBLIC_API_URL` is used by the browser API helper, with a localhost default. `apps/web/lib/api.ts`.
- [CODE] No Vercel, Railway, Docker, CI workflow, deployment manifest, or `.env.example` was found in the inspected repository tree. [DOC] `APIcmd.md` gives a Windows local-dev path and PowerShell commands only.
- [INFERRED] Deployment targets are **NOT FOUND** in checked-in code/configuration. Earlier statements that the frontend deploys to Vercel and API to Railway are not supported by this checkout.

## 3. ANALYSIS PIPELINE

### Clone, limits, timeout, cache, and cleanup

| Setting | Exact current behavior |
|---|---|
| Clone command | [QUOTE] `spawn('git', ['clone', '--no-tags', \`--depth=${ANALYSIS_MAX_COMMITS + 1}\`, repoUrl, repoPath], ...)` — `apps/api/src/utils/git.ts`, `cloneRepo`. [CODE] `ANALYSIS_MAX_COMMITS` is 10,000, so the depth argument is 10,001. |
| Clone timeout | [QUOTE] `export const CLONE_TIMEOUT_MS = 60_000` — `apps/api/src/config/limits.ts`. [CODE] On timeout the child receives SIGTERM, then SIGKILL after 2 seconds if still running. Clone timeout maps to HTTP 408. `cloneRepo`; route handlers. |
| History cap | [QUOTE] `export const ANALYSIS_MAX_COMMITS = 10_000` — `apps/api/src/config/limits.ts`. [CODE] Git readers request one extra commit in some calls to determine `historyTruncated`; returned metrics are based on at most 10,000 commits. The cap is enforced both by Git `-<limit>` arguments and parsers. |
| Total scan timeout | [QUOTE] `export const SCAN_TIMEOUT_MS = 3 * 60_000` — `apps/api/src/config/limits.ts`. [CODE] `createScanContext` starts the deadline before clone in request handlers and propagates abort signals to Git operations; timeout maps to HTTP 408 with `SCAN_TIMEOUT`. |
| Checkout size | [QUOTE] `export const REPOSITORY_MAX_BYTES = 1024 * 1024 * 1024` — `apps/api/src/config/limits.ts`. [CODE] `directoryBytes` recursively totals regular file sizes; clone polls once per second and checks again when clone finishes. Thus it is a periodic check, not a filesystem quota; a transient overshoot between polls is possible. `apps/api/src/utils/git.ts`. |
| Temporary directory | [CODE] `mkdtemp(join(tmpdir(), 'wot-git-'))` creates a unique OS-temp folder. Clone failure removes it; successful analysis routes call `cleanupRepo` in `finally`. `apps/api/src/utils/git.ts`, route files. |
| Cache | [CODE] `POST /analyze` caches for 24 hours by normalized repository URL. `POST /repo-health` and `/dashboard` use 6-hour caches (the dashboard cache has a 10-minute check period). `refresh: true` in body or query bypasses cache. Cache is in process memory, with no persistent backing store. `apps/api/src/routes/*.ts`. |
| Cancellation | [CODE] A disconnected request aborts the scan; clone process receives termination, and simple-git receives an abort signal. `apps/api/src/routes/*.ts`, `apps/api/src/utils/scan.ts`, `apps/api/src/utils/git.ts`. |

- [CODE] Hard failures include clone timeout, total scan timeout, checkout size limit, invalid URL, and private/missing repo; history/file coverage limits can instead return a result carrying truncation flags. `AnalysisError`, route error handling, result metadata.
- [CODE] Analysis path filters are separate from Health/README. `apps/api/src/utils/fileFilter.ts`, `repoHealth.ts`, `repositoryOverview.ts`.

### Git-history extraction and shared file filters

- [QUOTE] `git.raw(['log', '-z', \`-${maxCommits + 1}\`, '--format=%x1e%H%x00%ad', '--date=short', '--name-only'])` — `apps/api/src/services/gitHistory.ts`, `readGitHistory`.
- [CODE] The NUL-delimited parser uses record separator + 40-character hash, then date, then names. It increments churn once per eligible path appearance in each parsed commit; `lastTouched` is the date from the newest encountered commit. Files are excluded by `isExcludedFile`. `gitHistory.ts`, `utils/fileFilter.ts`.
- [CODE] At most 10,000 distinct paths are retained in this history map. Churn output is ordered by descending count then path. `gitHistory.ts`.
- [CODE] Per-commit path arrays used for co-change are capped at 100 included files; hitting this sets a truncation flag. `gitHistory.ts`; shared limits.
- [CODE] General analysis exclusions include Markdown/text/web assets, media/font/archive/lock/key/cert/source-map extensions; package manifests/lockfiles, `.env`, `.env.local`, names starting `.env.`, and directories such as `node_modules`, vendor/build outputs, docs/examples/benchmarks/spec, `.github`, and `.git`. This means README, CI and package metadata are excluded from Git-history file metrics but may be inspected separately by Health/Overview. `apps/api/src/utils/fileFilter.ts`.
- [CODE] The exclusion implementation has exact filename comparisons for several names and case-insensitive extension conversion; directory comparisons use exact names after path splitting. This is a heuristic filter, not a language-aware classification. `isExcludedFile`, `isExcludedDirectory`.

### Each analysis and exact definitions

#### Commit frequency

- [QUOTE] `git.raw(['log', \`-${maxCommits + 1}\`, '--format=%ad', '--date=short'])` — `apps/api/src/services/commits.ts`, `runCommits`.
- [CODE] Counts commits per Git author date (`%ad`, short date) and sorts by date ascending. The extra commit detects truncation. `commits.ts`.
- [CODE] Standard `git log` traversal is used; there is no explicit `--first-parent` flag. Exact merge-history consequences were not separately tested: **UNSURE**. `commits.ts`.

#### Commit sizes

- [QUOTE] `git.raw(['log', '-z', \`-${maxCommits}\`, '--numstat', '--format=COMMIT_START%n%H%n%ad', '--date=short'])` — `commits.ts`, `runCommits`.
- [CODE] Each commit size is summed `numstat` insertions + deletions across files. Binary `-` counts parse as zero; rename numstat records are consumed as NUL path fields. It measures historical changed lines, not current file bytes. `parseCommitSizes`.
- [CODE] The dashboard computes median, size buckets, and the small-commit ratio from this bounded list; the UI identifies the atomic threshold as `<=50` inserted-plus-deleted lines. `apps/web/components/panels/CommitSizes.tsx`.

#### Churn and last touched

- [QUOTE] `git.raw(['log', '-z', \`-${maxCommits + 1}\`, '--format=%x1e%H%x00%ad', '--date=short', '--name-only'])` — `gitHistory.ts`.
- [CODE] `churnCount` is the number of included commit records in which the path appears, not line count. `lastTouched` is the latest scanned author date for the path. Per-commit appearances are counted once as each parsed name token; there is no explicit rename aggregation or path-history unification. `parseNameOnlyHistory`.
- [CODE] Initial additions can count as touches; excluded paths do not count. Merge commits follow default `git log` behavior because no `-m`/`--first-parent` override is present. The exact effect on diverse merge shapes is **UNSURE**.

#### Hotspots

- [QUOTE] Normalization: `if (max === min) return values.map(() => 0.5)` and `return values.map(v => (v - min) / (max - min))` — `apps/api/src/services/hotspot.ts`, `normalize`.
- [QUOTE] `hotspotScore: Number(((normalizedChurn[i] + normalizedSize[i]) / 2).toFixed(4))` — `calculateHotspotScores`.
- [CODE] Inputs are churn count and `stat().size` for each eligible file in the current checkout (bytes). Each dimension is independently min-max normalized across the included files to [0,1]; all-equal dimension values receive 0.5. Their arithmetic mean is rounded to four decimals. Output sorts descending score and path for ties. `hotspot.ts`.
- [CODE] A file whose current stat lookup fails is assigned 0 bytes. `runHotspot`.

#### Ownership and single-author flag

- [QUOTE] `git.raw(['log', '-z', \`-${ANALYSIS_MAX_COMMITS}\`, '--format=%x1e%H%x00%ae', '--name-only'])` — `apps/api/src/services/ownership.ts`, `runOwnership`.
- [CODE] Author identity is Git author email `%ae`; per-file counts use included file appearances across scanned commits. At most 100 distinct author emails per file are retained. `ownership.ts`.
- [CODE] `dominantAuthor` is the retained author with the greatest count; ties follow sorted email order because authors are sorted lexically and the reduction replaces only on strictly greater count. Empty author data becomes `unknown`. `runOwnership`.
- [QUOTE] `isBusFactor: authors.length === 1` — `runOwnership`.
- [INFERRED] “Bus factor” here is a label for a one-recorded-email heuristic; it does not establish current responsibility or actual team resilience.

#### Co-change / coupling

- [CODE] Uses commit path lists from `readGitHistory`; each commit’s files are deduplicated and sorted. Every unordered pair receives one count for a commit containing both paths. Paths are alphabetically ordered to avoid pair duplicates. `apps/api/src/services/gitHistory.ts`, `calculateCoChange`.
- [CODE] Pairs with count `<=1` are discarded. Up to 100,000 distinct pair keys are held; result is sorted by count descending then both paths and sliced to 200 by default. `calculateCoChange`.
- [CODE] The per-commit file list is capped at 100 included paths, so larger changes can omit pairs; `cochangeTruncated` reports relevant caps. `gitHistory.ts`, `analysis.ts`.

#### Commit log, bug-associated files

- [QUOTE] `git.raw(['log', '-z', \`-${maxCommits + 1}\`, '--numstat', '--format=COMMIT_START%n%H%n%an%n%ae%n%aI%n%s'])` — `apps/api/src/services/commitReader.ts`, `runCommitReader`.
- [CODE] Parser records 40-character SHA-1 hash, author name/email, author ISO author timestamp, commit subject (`%s`), included file paths, and per-file numstat. It caps included paths at 100 per commit. `parseCommitReaderOutput`.
- [CODE] `commitSizes` and `commitLog` are separate records: sizes are summed line counts; commit log carries each file’s line counts. `packages/types/index.ts`.

#### File outline

- [CODE] Walks checkout files in deterministic name order, excluding hidden directories and the shared exclusions; scans at most 300 files, only `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.cs`, `.go`; skips files larger than 500 KiB. `apps/api/src/services/outline.ts`.
- [CODE] Regex patterns extract function/class names and 1-based source lines. This is approximate and misses syntax not matching patterns (including many declaration styles/languages); it does not build a language AST. `outline.ts`.

#### Repository Health

- [CODE] Health examines Git history up to 10,000 commits and current repository tree paths, with up to 10,000 selected paths. Important paths are prioritized when this cap is exceeded. Historical commit file lists are capped at 100 source paths/commit. Monthly timeline is capped at 120 months; Git tree work is batched six months at a time. `apps/api/src/services/repoHealth.ts`, `config/limits.ts`.
- [CODE] Project type is a heuristic: package manifests may indicate application via start/serve scripts or Next/Nuxt/Vite/Express deps; package main/exports/types/bin indicates library; `src/main.rs`, `src/main.java`, `manage.py`, `src/lib.rs`, and web `.csproj` checks are additional signals. Otherwise `unknown`. `classifyProject`.
- [CODE] Categories are Change risk, Tests, Documentation, Continuous integration, Secret hygiene, Container setup. Applicable category scores are equally averaged and rounded. Deployment is not applicable unless project type is `application`; Change risk is not applicable if no source files changed in the 12-month window. `makeCategories`, `scoreFor`, `runRepoHealth`.
- [CODE] Change risk counts source paths touched at least five times in the latest 12-month period represented by history; score is `max(0, round(100 - min(100, hotspotCount/sourceFileCount * 300)))`. Tests score 50 for recognizable test files and 50 for recognized test config; docs score 60 README +40 other docs; CI is 100/0; security is 0 if a likely pattern found, else 30 if an env file is tracked, otherwise 100; application deployment is Docker 100/0. `scoreFor`.
- [CODE] “Healthy” status is score >=70; below 70 is `needs_attention`; null score is `not_applicable`. `categoryStatus`.
- [CODE] README/docs/tests/CI/Docker recognition is filename/path based. CI recognition includes GitHub Actions, GitLab CI, CircleCI, Azure Pipelines, Jenkinsfile, Buildkite; Docker recognition includes Dockerfile, docker-compose YAML, compose YAML. `getSignals`.
- [CODE] Secret patterns include private-key headers, AWS access-key IDs, GitHub tokens, and credential assignments. Files with selected text/config extensions are scanned from current revision only; max 2,000 candidates, 512 KiB/file, 20 MiB total, and 100 findings. NUL-containing files are skipped. Matched value is not returned; path/line/pattern are returned. Oversized or over-budget scans set `secretScanTruncated`. `SECRET_PATTERNS`, `scanCurrentSecrets`.
- [CODE] Monthly timeline reconstructs up to 120 months from each month’s latest scanned commit tree; it reports score, commits that month, repeated-change count, env-file count, README/tests/CI/Docker presence. It is limited by available bounded history. `buildTimeline`, `runRepoHealth`.

#### README overview

- [CODE] `readRepositoryOverview` finds a root or nested basename matching `README` with optional extension, reads only regular non-symlink files up to 256 KiB, stores full text and an extracted title/short paragraph. `apps/api/src/services/repositoryOverview.ts`.
- [CODE] Markdown is rendered via a safe Markdown component without raw HTML; relative images get a GitHub raw-content base URL when origin/ref resolution succeeds. `apps/web/components/shared/SafeMarkdown.tsx`, `RepositoryOverview.tsx`; `repositoryOverview.ts`.

## 4. BUG-FIX DETECTION AND EVALUATION

### Heuristic

- [QUOTE] Entire current classifier:

```ts
const BUG_FIX_PATTERN = /\b(?:fix|bug|defect|error|issue|patch|repair|resolve|close|crash)\b/i

export function isBugFixMessage(message: string): boolean {
  return getBugFixKeyword(message) !== null
}

export function getBugFixKeyword(message: string): string | null {
  return message.match(BUG_FIX_PATTERN)?.[0].toLowerCase() ?? null
}
```

- [CODE] Source: `apps/api/src/utils/bugFix.ts`. This is case-insensitive (`i`) and whole-word (`\b`) matching, on the commit subject only (`%s`). Exact keywords: `fix`, `bug`, `defect`, `error`, `issue`, `patch`, `repair`, `resolve`, `close`, `crash`.
- [CODE] Each matching commit sets `isBugFix`; its included files are aggregated by path to `bugFiles`, incrementing one per matched commit that includes the file. The per-commit 100-file cap also limits associations. `commitReader.ts`.
- [CODE] The returned matched keyword is lowercase and records the first match in subject order. `getBugFixKeyword`, `CommitRecord.matchedBugFixKeyword`.

### Benchmark and limits of validation

- [CODE] A small offline benchmark exists at `apps/api/benchmarks/benchmark-signals.ts`, using manually labeled fixture `apps/api/benchmarks/fixtures/history-signals.json`. Run with `pnpm --filter @wot-git/api benchmark`.
- [CODE] On 2026-10-22, observed fixture-only output: commit keyword accuracy 0.875 (7/8); bug-associated files precision 0.800, recall 1.000, F1 0.889; hotspot precision@2 1.000 and recall@2 1.000; top 2 `src/auth.ts`, `src/session.ts`. This is one small synthetic fixture, not general accuracy evidence.
- [CODE] **NOT FOUND:** The benchmark does not compare predicted risky files with later independently observed defects over a time split. There is no implemented random baseline or representative multi-repository evaluation in the inspected benchmark.
- [CODE] **NOT FOUND:** The implementation does not choose a predicted risky set by top 20% or any percentage cut-off. It returns all hotspot rows, ranked; displayed subsets are UI pagination/limits, not a benchmark label rule. `hotspot.ts`, dashboard panels.
- [INFERRED] Bug-message keywords are proxy labels and are vulnerable to vague, non-English, misleading, or inconsistent commit messages; this limitation follows from the classifier’s input and is not a measured model error rate.
- [CODE] No time-based train/test split is present in the fixture benchmark. The history window used for signal computation and message labels overlaps. A prospective evaluation is **NOT FOUND**.

### Configured repositories / prior runs

- [CODE] Fixture content includes the benchmark’s synthetic file labels; no list of real repositories configured for systematic evaluation was found. `apps/api/benchmarks/fixtures/history-signals.json`.
- [DOC] `APIcmd.md` gives Express as a manual API example; it is not an evaluation result and does not record an analysis duration, response size, or validated metrics.
- [CODE] No repository result/log artifacts were found in the checked-in project. A live public-repository scan was not run for this handoff because the environment’s network access is restricted; analysis time and response size are therefore **NOT MEASURED**.

## 5. API AND DATA MODEL

### Endpoints

API base URL in local development: `http://localhost:3001`; configured by `PORT` or defaults to 3001. [CODE] `apps/api/src/index.ts`.

| Method and path | Request | Success response | Error behavior |
|---|---|---|---|
| `GET /health` | No body | `{ "status": "ok" }` | No route-specific errors. [CODE] `apps/api/src/index.ts`. |
| `POST /analyze` | JSON `{ "repoUrl": string, "refresh"?: boolean }`; `refresh=true` may also be query string | `AnalysisResult` with cache metadata `fromCache` when cached | 400 `INVALID_URL`; 404 `REPO_NOT_FOUND`; 408 `CLONE_TIMEOUT` / `SCAN_TIMEOUT`; 413 `REPO_TOO_LARGE` / `REPO_SIZE_LIMIT`; 500 `INTERNAL_ERROR`. Disconnect cancels; no guaranteed response. [CODE] `routes/analyze.ts`. |
| `POST /repo-health` | Same URL/refresh input | `RepoHealthResult`, optionally `fromCache` | 400; 404; 408 clone/scan timeout; 413 checkout too large; 500. [CODE] `routes/repoHealth.ts`. |
| `POST /dashboard` | Same URL/refresh input | Combined `{ analysis, health, overview }` as `DashboardResult`, optionally `fromCache` | 400; 404; 408; 413; 499 `SCAN_ABORTED` where connection remains writable; 500. [CODE] `routes/dashboard.ts`. |
| `POST /dashboard/stream` | Same URL/refresh input | HTTP 200 `text/event-stream`; SSE `data: {type:"stage",phase,status}`, `{type:"cache"}`, `{type:"complete",result}`, or `{type:"error",error,code}` | Invalid input returns HTTP 400 before stream. After headers, scan failures are SSE error messages, not a changed HTTP status. Keep-alive comment every 15 seconds. [CODE] `routes/dashboard.ts`. |

- [CODE] All repo-analysis endpoints require `repoUrl` to be a string with a valid URL, `hostname === 'github.com'`, and at least two non-empty pathname components. Validation does not prove that the path names an existing repository; Git clone resolves that. `isValidGithubUrl`, route validation functions.
- [CODE] Error middleware serializes generic unhandled errors as HTTP 500 `{error:"Internal server error", code:"INTERNAL_ERROR"}`. `apps/api/src/middleware/errorHandler.ts`.
- [INFERRED] The standalone `/repo-health` endpoint runs a separate clone; combined `/dashboard` is the UI’s one-clone path. Both behaviors are explicit in `repoHealth.ts` and `dashboard.ts`.

### Main shared interfaces

- [QUOTE] Core result shapes (`packages/types/index.ts`):

```ts
export interface CommitFrequency { date: string; count: number }
export interface CommitSize { hash: string; date: string; insertions: number; deletions: number }
export interface FileChurn { path: string; churnCount: number; lastTouched: string }
export interface FileOwnership { path: string; authors: string[]; dominantAuthor: string; isBusFactor: boolean }
export interface Hotspot { path: string; churnScore: number; sizeScore: number; hotspotScore: number }
export interface CoChange { fileA: string; fileB: string; count: number }
export interface FileOutline { name: string; type: 'function' | 'class'; line: number }
```

- [QUOTE] `CommitRecord` (`packages/types/index.ts`):

```ts
export interface CommitRecord {
  hash: string
  authorName: string
  authorEmail: string
  timestamp: string
  message: string
  files: CommitFile[]
  filesTruncated: boolean
  isBugFix: boolean
  matchedBugFixKeyword: string | null
}
```

- [CODE] `AnalysisResult` contains repository URL/time, the metrics above, outline map, commit log, bug-associated files, and `scan` coverage flags/limits. `DashboardResult` combines analysis, health, and repository overview. `RepoHealthResult` contains project type, overall score, categories, findings, timeline, and history/file/secret truncation flags. See full interfaces in `packages/types/index.ts`.
- [CODE] Error-code union is `REPO_NOT_FOUND`, `REPO_TOO_LARGE`, `REPO_SIZE_LIMIT`, `CLONE_TIMEOUT`, `SCAN_TIMEOUT`, `SCAN_ABORTED`, `INVALID_URL`, `INTERNAL_ERROR`. `AnalysisError`.

## 6. USABILITY AND USER FLOWS

### Screens and views

| Screen/view | Data and visible behavior |
|---|---|
| Landing `/` | [CODE] Repository URL/owner-repo entry, GitHub search suggestions, keyboard-combobox handling, validation/error state, and analysis submit. Disclaimer links to Guide. `apps/web/app/page.tsx`. |
| Dashboard Overview | [CODE] README rendered as Markdown below summary cards; active-area summaries, Health summary, report links, CSV/Markdown download actions. Missing/unreadable README gets explanatory empty text. `RepositoryOverview.tsx`, dashboard page. |
| Hotspots | [CODE] Ranked files with normalized churn/byte-size/mean score; file inspect action, search and CSV. `HotspotChart.tsx`. |
| Bug Files | [CODE] Files in commits whose subjects match the keyword rule; file inspection, local search, CSV. `BugFilesTable.tsx`. |
| Commit Activity | [CODE] Daily commit area chart with Recharts brush/zoom and date inputs; date-range commit list, changed-file inspect buttons, adjacent 90-day comparison, partial notice, CSV. `CommitActivity.tsx`. |
| Commit Sizes | [CODE] Per-commit insertion/deletion sizes, median, atomic ratio (<=50), buckets and CSV. `CommitSizes.tsx`. |
| Churn | [CODE] Commit appearance count and last touched, search, file inspection, pagination/show-more, CSV. `ChurnTable.tsx`. |
| Commit Log | [CODE] Individual structured commits, file changes, matched bug keyword where present, search/filters and CSV. `CommitLog.tsx`. |
| Ownership | [CODE] Recorded email identities per file, dominant author/single-author flag; contributor filter, clear-filter action, file inspection, CSV. `OwnershipTable.tsx`. |
| Co-Change | [CODE] Repeatedly co-committed file pairs and counts; search, inspect, CSV. `CoChangeTable.tsx`. |
| Outline | [CODE] Regex-extracted functions/classes and line numbers for supported files; filtering/tree interactions and CSV. `OutlineTree.tsx`. |
| Health | [CODE] Overall/category scores, category applicability, findings, secret redaction, monthly chart and CSV. `RepoHealthPanel.tsx`. |
| File inspection panel | [CODE] Combined selected-file evidence: churn/last touched, hotspot components, author data, bug-associated count, 12-month activity buttons, commit records/keyword, co-change pairs. Some evidence may be partial. `FileEvidencePanel.tsx`. |
| Guide `/guide` and dashboard Guide | [CODE] Shared tabbed guide with “How to read results”, “Calculations”, FAQ, usage terms, and data/privacy; disclosures are expandable. `ProjectGuide.tsx`, `apps/web/app/guide/page.tsx`. |

- [CODE] Shared date/path filters narrow commit-level views and file rows where wired; aggregate hotspot/ownership/co-change calculations remain full-scan outputs and are labeled accordingly. README, Guide, and static Health do not use those history filters. `apps/web/app/r/[owner]/[repo]/page.tsx`, `dashboardExploration.ts`, views.
- [CODE] View switching resets scroll; disclosure expansion and local filtering do not. Top-level mobile navigation is horizontally scrollable; subtabs wrap. Sidebar can be hidden/shown. `page.tsx`, `Sidebar.tsx`, `NavigationToggle.tsx`.
- [CODE] Loading shell shows clone/analysis/health/overview stages; errors use shared error components; empty states are present in panels. `DashboardLoading.tsx`, `useDashboard.ts`, panel components.
- [CODE] CSV downloads are browser-generated, include view data matching filters, scan date and coverage notes; formula-leading cell values are protected. Overview Markdown export omits full README and secret values. `ExportCsvButton.tsx`, `dashboardExploration.ts`.

### Main user journey

1. [CODE] Enter a public GitHub repository URL or owner/repo on `/`.
2. [CODE] Optionally use GitHub-sourced suggestions; submit to open `/r/{owner}/{repo}`.
3. [CODE] Dashboard requests `/dashboard/stream`, displays real stage events while backend clones and scans, and reports errors or completes.
4. [CODE] Start on Overview; read repository README and summary, then select views or click a file to open File Inspection.
5. [CODE] Use dates/path search, compare periods, inspect commits, and export filtered rows or summary.
6. [CODE] Use Guide and Methodology to understand formulas, coverage, privacy, and limitations.

### User interpretation, messages, and constraints

- [CODE] Guide states that results are evidence/signals to investigate, not proof of defects or quality; Bug Files are keyword association, and Health does not run tests. `ProjectGuide.tsx`.
- [CODE] UI exposes key limits: at most 10,000 commits, 10,000 analysis paths, 100 included files per commit, 100 authors per file, 200 returned co-change pairs after max 100,000 pair keys, 300 outline files, 60-second clone, 3-minute scan, 1-GiB checkout, and secret scan limits. `ScanCoverageNotice.tsx`, services/config, Guide.
- [CODE] User-facing failures include “Repository not found or is private”, “Clone timed out. The repository may be too large.”, “Repository analysis exceeded the 3 minute scan limit. Try a smaller repository.”, and “Repository checkout exceeds the 1 GiB scan limit.” `routes/*.ts`.
- [CODE] A browser live screen-reader/keyboard/mobile audit was **NOT RUN** for this handoff. Accessibility-related semantics are present in the landing combobox/listbox and many buttons/labels; that is code inspection, not full conformance evidence. `apps/web/app/page.tsx`, components.
- [CODE] Production build generated `/`, `/guide`, and dynamic `/r/[owner]/[repo]`; build output is in Section 9. This verifies compilation/type checking but not browser behavior.

## 7. ENGINEERING DECISIONS

| Decision | Visible alternatives | Stated reason | Consequence/trade-off | Evidence |
|---|---|---|---|---|
| pnpm monorepo with shared types | Separate repositories/packages are not present | **reason not documented** | Shared workspace contract; shared release/version coordination | [CODE] root manifests, `packages/types/index.ts` |
| Next.js 14 + React + Tailwind | No alternate frontend implementation present | **reason not documented** | Browser dashboard with framework routing/build; version tied to package manifest | [CODE] `apps/web/package.json`, Next config |
| Express API with TypeScript | No alternate backend present | **reason not documented** | JSON endpoints and stream route; runtime requires Node and Git binary | [CODE] `apps/api/src/index.ts`, package manifest |
| Git subprocess clone and simple-git history commands | AST/parser or GitHub API history are not used for core metrics | **reason not documented in code** | Language-neutral metadata, but clone cost and history heuristics remain | [CODE] `utils/git.ts`, `utils/scan.ts`, services |
| Shallow clone, 60s/3m/1GiB bounds | Unbounded scan is not allowed by current configuration | [DOC/COMMIT] Commit `0ff5aca` (2026-10-20) title “feat: bound repository scans and add file evidence panel”; no detailed rationale text verified | Bounded resource use, but partial coverage/errors for large repositories | [CODE] limits and clone logic; [COMMIT] listed commit |
| Temporary clone then cleanup | Persistent repository storage is not implemented | **reason not documented** | Avoids retained checkout on normal completion; relies on `finally` and process lifecycle | [CODE] clone/cleanup functions and routes |
| In-memory NodeCache | Persistent cache is absent | **reason not documented** | Fast repeats within process; data lost on restart; not shared across API instances | [CODE] route cache construction |
| Hotspot is mean of min-max normalized churn and byte size | Multiplication was previously assumed, but code uses arithmetic mean | **reason not documented** | Either dimension can raise score; scores are relative to comparison set | [CODE] `hotspot.ts` |
| Regex outline rather than AST | No parser alternatives present | **reason not documented** | Lightweight but syntax/language coverage is incomplete | [CODE] `outline.ts` |
| Recharts | No other chart library present | **reason not documented** | Responsive charts/brush in current UI; bundle dependency | [CODE] web manifest and `CommitActivity.tsx` |
| Browser-side CSV/Markdown generation | Server-side export endpoint not present | **reason not documented** | No account/server state; all currently loaded response data can be exported | [CODE] `dashboardExploration.ts`, export component |
| Health uses static checks and heuristics | Running repository tests/installing dependencies is not implemented | [DOC] Guide explains scans are static and do not run tests; why selected is **reason not documented** | Safe bounded checks, but presence is not proof tests pass or are adequate | [CODE] `repoHealth.ts`; [DOC] `ProjectGuide.tsx` |
| Deployment targets | No provider config found | **NOT FOUND** | Deployment process cannot be reconstructed from checkout | [CODE] repository file search |

## 8. SECURITY AND ROBUSTNESS

- [CODE] Input protocol is restricted to hostname `github.com`, at least two URL path segments; invalid values return 400. It does not accept arbitrary hosts in normal API flow. `routes/*.ts`.
- [CODE] Clone invokes `spawn('git', [...args])` with an argument array, not a shell command string, so URL data is not interpolated into shell syntax. `apps/api/src/utils/git.ts`.
- [CODE] File reads for README and Health resolve a relative path, verify it stays under repository root, and reject symlinks/non-regular files; README also has a 256-KiB size cap. `repositoryOverview.ts`, `repoHealth.ts` (`readRegularRepoFile`).
- [CODE] API enables `cors()` without an origin allowlist. No rate-limiting middleware was found. `apps/api/src/index.ts`.
- [CODE] JSON parser is Express `express.json()` with no explicit size option. Application-specific request body size limit is **NOT FOUND**; Express/body-parser default behavior applies, but exact effective version should be verified from the lockfile/runtime before documenting as an application guarantee.
- [CODE] Private/missing repos map to 404; no authentication mechanism is implemented. The API accepts only public GitHub URL workflow. `routes/*.ts`, Guide.
- [CODE] Resource bounds and client-disconnect cancellation are implemented as described in Section 3. Potential risk: checkout size is polled periodically rather than enforced as a hard OS quota. `utils/git.ts`.
- [CODE] Secret scanning is pattern-limited, current revision only, bounded, and redacts matches. It is neither a full secret scanner nor a history scrubber. `repoHealth.ts`.
- [CODE] CSV generation escapes quote/comma/newline cases and protects formula-like first characters in string cells; tests cover formula strings. `apps/web/lib/dashboardExploration.ts`, test file.

## 9. TESTING AND QUALITY

### Tests and run results

- [CODE] Command: `pnpm --filter @wot-git/api test`.
- [CODE] Result on 2026-10-22: 25 tests, 11 suites, 25 passed, 0 failed, 0 skipped. Coverage includes commit-date filters, comparison/date windows, monthly activity, CSV/Markdown output, repository evidence, analysis composition, Git path parsing and history truncation, commit-size parsing, hotspot normalization, Health detection/secret redaction/symlink rejection, README extraction, and scan cancellation.
- [CODE] Test files: `apps/api/src/services/analysis.test.ts`, `gitHistory.test.ts`, `metricParsing.test.ts`, `repoHealth.test.ts`, `apps/api/src/utils/scan.test.ts`, and `apps/web/lib/{commitActivity,repositoryEvidence,dashboardExploration}.test.ts`.
- [CODE] Command: `pnpm --filter @wot-git/api benchmark`; it completed with fixture-specific scores listed in Section 4.
- [CODE] Command: `pnpm --filter @wot-git/web build`; it completed successfully, including compilation, lint/type validity checks, and static page generation. Routes listed: `/`, `/guide`, `/r/[owner]/[repo]`.
- [CODE] `pnpm -r lint` exists but was not run. API test script explicitly enumerates test files; there is no test script in web manifest.

### Quality gaps / known limitations

- [CODE] HTTP integration tests, browser end-to-end tests, accessibility automation, and real-repository regression fixtures were **NOT FOUND**.
- [CODE] Offline benchmark uses one small synthetic labeled fixture. It does not support broad quality claims.
- [CODE] TODO/FIXME/HACK markers were **NOT FOUND** in the searched `apps` and `packages` source trees.
- [INFERRED] Current user-visible signals can mislead if read as defect verdicts: commit message semantics, regex outline recognition, file filters, relative hotspot scores, and static Health presence checks all have known false-positive/false-negative pathways. This inference is consistent with explicit Guide caveats.
- [CODE] Live scan time, memory/CPU use on representative repositories, and actual HTTP behavior against GitHub were not measured in this handoff.

## 10. DEVELOPMENT HISTORY

- [COMMIT] First commit in current repository history: `643b1f6`, 2026-09-09, “Update : MVP version of tool”.
- [COMMIT] Last commit at inspection: `05df69a`, 2026-10-21, “fix: reset dashboard tab scroll and clarify analysis signals”.
- [COMMIT] `git rev-list --count HEAD` returned 13 commits.

| Date | Commit | Milestone |
|---|---|---|
| 2026-09-09 | `643b1f6` | [COMMIT] MVP baseline. |
| 2026-09-09 | `9259b9c` | [COMMIT] “feat: fixing word formating”. |
| 2026-09-22 | `bbdb9d4` | [COMMIT] “mod: change name”. |
| 2026-09-23 | `0d458df` | [COMMIT] Simplified hotspot header/focus presets. |
| 2026-09-23 | `c5e5bbd` | [COMMIT] Removed `.next` build output and ignored it. |
| 2026-09-24 | `90ce4a8` | [COMMIT] Responsive repository navigation and analysis loading state. |
| 2026-10-05 | `6308c16` | [COMMIT] Unified analysis and repository ignore filters. |
| 2026-10-05 | `706717c` | [COMMIT] Removed `.pnpm-store/v11` directory. |
| 2026-10-12 | `ee12082` | [COMMIT] Added repository Health analysis/dashboard. |
| 2026-10-14 | `cb5088a` | [COMMIT] Added repository Overview and expanded Guide. |
| 2026-10-15 | `9eed971` | [COMMIT] README rendering/images and sticky navigation. |
| 2026-10-20 | `0ff5aca` | [COMMIT] Bounded repository scans and file evidence panel. |
| 2026-10-21 | `05df69a` | [COMMIT] Reset tab scroll and clarify analysis signals. |

- [CODE] Working tree also contains uncommitted changes that add report export and exploration helpers and change commit keyword metadata/types. They have no commit hash yet; `git status --short` at inspection.
- [DOC] Only planning/reference document found at shallow root is `APIcmd.md`; its examples describe `/analyze`, an instant cached second run, “6 services,” and characterize hotspots as “most dangerous code.” The current implementation has a combined `/dashboard` path, Health and Overview, 6-hour dashboard cache, and explicitly cautions that a hotspot is not a defect verdict. Treat old document language as outdated. `APIcmd.md`; current code `routes/dashboard.ts`, `ProjectGuide.tsx`.
- [CODE] No `AGENTS.md`, TODO plan, CI workflow, or deployment notes found in the inspected repository tree.

## 11. SIZE OF THE SYSTEM

Counting method: [CODE] `find` over `.ts`/`.tsx` under API `src`, web `app/components/hooks/lib`, and `packages/types`; `wc -l` over those files. Counts include tests and generated source declaration `next-env.d.ts` where included; exclude node_modules/build output.

| Area | TypeScript source files | Lines |
|---|---:|---:|
| API (`apps/api/src`) | 26 | 2,109 |
| Web (`apps/web/app`, `components`, `hooks`, `lib`) | 50 | 4,511 |
| Shared types (`packages/types`) | 1 | 176 |
| **Total counted** | **77** | **6,796** |

- [CODE] There are 8 test files in the test paths above; tests are included in the line totals. `find` over `*.test.ts` / `*.spec.ts`.
- [CODE] Dependency counts: API 5 direct runtime + 5 development; web 11 + 6; types 0 + 0; root 1 + 1. Counted from package manifest entries; transitive dependencies excluded.
- [INFERRED] File and line totals are a snapshot and will change with edits; the command method is included so they can be reproduced.

## 12. DIFFERENCES FROM THE EARLIER PLAN

| Earlier claim | Verdict | Current implementation |
|---|---|---|
| (a) pnpm monorepo with `apps/web`, `apps/api`, `packages/types` | **CORRECT** | [CODE] These are workspace packages; see root `pnpm-workspace.yaml` and manifests. |
| (b) Next.js 14/Tailwind/Recharts; Express/TypeScript/simple-git/node-cache | **CORRECT** | [CODE] Versions and packages are listed in Section 2. |
| (c) Web deploys to Vercel; API to Railway | **INCORRECT / NOT VERIFIED** | [CODE] No provider manifests or deployment config were found. Actual deployment target is **NOT FOUND**; absence in repo does not prove the project is not deployed elsewhere. |
| (d) hotspot is `norm(churn) * norm(size)` | **INCORRECT** | [QUOTE] `((normalizedChurn[i] + normalizedSize[i]) / 2)` — mean, not multiplication. `apps/api/src/services/hotspot.ts`. |
| (e) clone depth 500, 60-second timeout, 50,000 commit cap | **INCORRECT** | [CODE] Clone depth is `ANALYSIS_MAX_COMMITS + 1` = 10,001; clone timeout 60,000 ms; cap 10,000. `config/limits.ts`, `utils/git.ts`. |
| (f) churn is commits per file | **PARTLY CORRECT** | [CODE] It counts included commit appearances per path in bounded Git history, not lines; path exclusions, 10,000-file cap, and per-commit cap affect coverage. `gitHistory.ts`. |
| (g) bug words are fix, bug, defect, error, issue, patch, repair, resolve | **PARTLY CORRECT** | [CODE] Those eight plus `close` and `crash`; case-insensitive whole-word match on subject. `utils/bugFix.ts`. |
| (h) top 20% of hotspot files form predicted set | **INCORRECT** | [CODE] No such selection is implemented. Hotspot list is returned ranked; no predicted-set cut-off. |
| (i) analyses include commit frequency, commit size distribution, churn, last touched, file type distribution, ownership, bus factor, co-change, hotspot matrix, outline | **PARTLY CORRECT** | [CODE] Most listed measures exist. A file-type distribution view was **NOT FOUND**. Additional current capabilities include Health, README Overview, structured commit log, keyword-associated Bug Files, file evidence, activity comparisons, shared filters and exports. |

## 13. WEAK POINTS

- [CODE] Bug-file associations use English subject keywords, not issue labels, test outcomes, stack traces, or verified defects. Poor/empty/non-English messages can reduce usefulness; ordinary text containing a keyword can create false associations. `bugFix.ts`, `commitReader.ts`.
- [CODE] Hotspot is a relative average of change frequency and current bytes, not a direct defect probability. A high score does not mean the file is broken; scores depend on the files included for normalization. `hotspot.ts`; Guide.
- [CODE] History, files, per-commit paths, authors, pairs, outline files, health paths, secret scan candidates/bytes/findings, clone time, total scan time, and checkout bytes are capped. Missing rows may reflect caps or filters rather than absence. `limits.ts` and service parsers.
- [CODE] Health test checks detect recognizable names/configs, not test quality or pass status. Docker presence is a presence signal and is only scored for application classification. `repoHealth.ts`.
- [CODE] Secret patterns are limited to four pattern families, current revision only, text/config extensions only, and resource caps. A clean result is not assurance that no secret exists. `repoHealth.ts`.
- [CODE] Project-type classification is rule-based and may return `unknown` or misclassify unconventional/multi-package repositories. `classifyProject`.
- [CODE] Ownership uses historical Git author email identity, which may differ across aliases and does not imply current expertise. `ownership.ts`.
- [CODE] Outline is regex-based for eight extensions and 300 files; declarations can be omitted or misidentified. `outline.ts`.
- [CODE] The benchmark is small, synthetic, and fixture-specific; it is not independent temporal validation. `benchmarks/`.
- [CODE] No API rate limiter or browser-level integration tests were found. `index.ts`, test inventory.
- [INFERRED] The largest defensibility gap is external validation: currently the project measures reproducible Git/static signals, but does not establish their predictive accuracy on representative future bug data.
- [DOC] The UI Guide explicitly frames metrics as decision support and says users should inspect supporting commits/code/tests. `apps/web/components/guide/ProjectGuide.tsx`.

## 14. FILES READ

The following files and directories were inspected for this handoff; directory listings were also used to verify the repository inventory and absence of deployment/CI/readme files.

- Root/config/docs: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` (inventory), `tsconfig.json`, `APIcmd.md`, `.gitignore` (inventory), `globals.d.ts` (inventory), `docs/PROJECT_CONTEXT.md` (created by this handoff).
- API configuration and entry: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts`, `apps/api/src/config/limits.ts`, `apps/api/src/middleware/errorHandler.ts`.
- API routes: `apps/api/src/routes/analyze.ts`, `apps/api/src/routes/dashboard.ts`, `apps/api/src/routes/repoHealth.ts`.
- API services: `apps/api/src/services/analysis.ts`, `gitHistory.ts`, `commitReader.ts`, `commits.ts`, `churn.ts`, `hotspot.ts`, `ownership.ts`, `cochange.ts`, `outline.ts`, `repoHealth.ts`, `repositoryOverview.ts`.
- API utilities: `apps/api/src/utils/bugFix.ts`, `fileFilter.ts`, `git.ts`, `scan.ts`.
- Shared data model: `packages/types/package.json`, `packages/types/index.ts`.
- Web configuration/data flow: `apps/web/package.json`, `apps/web/next.config.mjs`, `apps/web/tailwind.config.ts`, `apps/web/tsconfig.json`, `apps/web/app/page.tsx`, `apps/web/app/guide/page.tsx`, `apps/web/app/r/[owner]/[repo]/page.tsx`, `apps/web/lib/api.ts`, `apps/web/lib/commitActivity.ts`, `dashboardExploration.ts`, `repositoryEvidence.ts`, and their tests.
- Web panels and shared UI: `apps/web/components/layout/Sidebar.tsx`, `DashboardLoading.tsx`, `NavigationToggle.tsx`, `RepoHeader.tsx`; analysis/overview panels `RepositoryOverview.tsx`, `CommitActivity.tsx`, `FileEvidencePanel.tsx`, `HotspotChart.tsx`, `BugFilesTable.tsx`, `ChurnTable.tsx`, `CommitSizes.tsx`, `CommitLog.tsx`, `OwnershipTable.tsx`, `CoChangeTable.tsx`, `OutlineTree.tsx`, `RepoHealthPanel.tsx`, `ScanCoverageNotice.tsx`; Guide `ProjectGuide.tsx`; shared `SafeMarkdown.tsx`, `ExportCsvButton.tsx`, `InfoTip.tsx`, `FileInspectButton.tsx`, `HashBadge.tsx`, `ScoreBar.tsx`, `ErrorState.tsx`.
- Tests/benchmark: API service tests `analysis.test.ts`, `gitHistory.test.ts`, `metricParsing.test.ts`, `repoHealth.test.ts`; utility `scan.test.ts`; web helper tests `commitActivity.test.ts`, `dashboardExploration.test.ts`, `repositoryEvidence.test.ts`; benchmark script and fixture under `apps/api/benchmarks/`.
- [CODE] Repository inventory before the README addition found no root README, `AGENTS.md`, `.github` workflow files, Dockerfile/Compose file, `vercel.json`, or `railway.toml`. This handoff is now supplemented by a root `README.md`; no images are embedded in it. The inventory was limited to the checked-out repository and specified search depth; external deployment settings were not inspected.
- [CODE] Git metadata commands used: `git status --short`, `git log --reverse --format='%h %ad %s' --date=short`, `git log -1`, and `git rev-list --count HEAD`.
