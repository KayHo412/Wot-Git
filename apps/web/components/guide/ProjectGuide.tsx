"use client"
import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, BookOpen, ChevronDown, CircleHelp, Database, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GuideSectionId } from "@/components/guide/guideTypes"

const GUIDE_TABS = [
  { id: "how-to-read", label: "How to read results" },
  { id: "calculations", label: "Calculations" },
  { id: "faq", label: "FAQ" },
  { id: "usage-terms", label: "Usage terms" },
  { id: "data-privacy", label: "Data & privacy" },
] as const
type GuideTabId = typeof GUIDE_TABS[number]["id"]

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-muted">{children}</CardContent></Card>
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border border-border bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
        <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-accent group-open:rotate-180" />
        <span>{title}</span>
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3 text-sm leading-6 text-muted">{children}</div>
    </details>
  )
}

function HowToRead() {
  return <GuideCard title="How to read repository analysis">
    <p>Wot-Git turns Git history and recognizable repository files into review signals. Start with a question, then use the relevant view to inspect the evidence behind it. A signal tells you where to look; it does not prove a file is broken, safe, or well maintained.</p>
    <p>The report reflects the committed state of the repository’s default branch when it was cloned. It does not include uncommitted local changes, pull-request diffs, or other branches. Refresh to request a new scan after the repository changes.</p>
    <Disclosure title="What does Bug Files mean?">
      <p>Wot-Git scans commit subjects for bug-fix terms such as “fix,” “bug,” “defect,” “error,” “issue,” “patch,” “repair,” “resolve,” “close,” or “crash.” It lists files changed in matching commits. A match is a historical association, not a diagnosis of the current file. Commit wording can also create misses and false positives.</p>
      <p>Use the commit links to inspect the original changes and decide whether the file deserves review.</p>
    </Disclosure>
    <Disclosure title="What does a hotspot mean?">
      <p>Hotspots combine a file’s change frequency and current size relative to other included files in the same repository. A high score means “worth reviewing,” not “defective.” The score changes when the comparison set or repository changes.</p>
    </Disclosure>
    <Disclosure title="What does Repository Health mean?">
      <p>Health is a static checklist score for signals such as tests, documentation, automation, secret patterns, and container configuration. Wot-Git does not install dependencies, run tests, build the project, or certify its security or production readiness.</p>
    </Disclosure>
    <Disclosure title="How should I use the report?">
      <p>Use it to choose what to inspect next. Open the underlying commits and files, consider the repository’s conventions, and run the project’s own checks before making decisions. For example, if a large hotspot also appears in bug-fix-associated commits, inspect those commits and run the relevant tests; neither signal alone establishes a defect.</p>
    </Disclosure>
    <Disclosure title="Can I compare scores between repositories?">
      <p>Use caution. Hotspot values are normalized against the files in the same scan, and Health scores are checklist averages. They are useful for exploring one repository but are not calibrated benchmarks for comparing different teams, languages, or project types.</p>
    </Disclosure>
    <Disclosure title="What does an empty or missing result mean?">
      <p>It may mean no matching evidence was found in the scanned data, the relevant files were excluded or outside a limit, or the repository uses conventions Wot-Git does not recognize. “No data” is not evidence that a concern is absent. For Health checks, a zero score means a recognized check did not find its expected signal; “not applicable” means that category is excluded from the average.</p>
    </Disclosure>
  </GuideCard>
}

function Calculations() {
  return <GuideCard title="Calculations and examples">
    <p>Examples use invented small numbers. Some panels omit documentation, generated, media, dependency, or other non-source files according to their analysis filter.</p>
    <Disclosure title="Commit activity and analysis limits">
      <p>Commits are grouped by Git author date. The overview total is the sum of daily counts. Its distinct file total comes from the churn results. Example: 3 commits Monday plus 2 Tuesday gives 5 commits. The daily chart is a count of recorded commits; it does not measure code quality or activity from uncommitted work.</p>
      <p>Analysis uses up to the 10,000 most recent commits. When older history is omitted, the report marks history as truncated. Scans also stop after 3 minutes; clones stop after 60 seconds and temporary checkouts are limited to 1 GiB. A report with limited coverage should be interpreted as partial evidence.</p>
    </Disclosure>
    <Disclosure title="Commit sizes, median, buckets, and atomic ratio">
      <p><strong className="text-primary">Size per commit:</strong> inserted lines + deleted lines. Binary changes may have no line counts. The median is the middle size after sorting; for an even number of commits, the two middle values are averaged and rounded.</p>
      <p><strong className="text-primary">Atomic ratio:</strong> commits changing at most 50 lines ÷ all commits × 100. Example: 8 of 10 commits are at most 50 lines, so the ratio is 80%.</p>
      <p><strong className="text-primary">Buckets:</strong> Micro (&lt;10), Small (10–50), Medium (&gt;50–200), Large (&gt;200–500), Huge (&gt;500). Each bucket percentage is its commit count ÷ total commits × 100. The view also lists five largest commits and total inserted plus deleted lines. These labels categorize volume only; the “atomic” threshold does not prove a commit is well-scoped or safer.</p>
    </Disclosure>
    <Disclosure title="File churn and last touched">
      <p>File churn counts commits that touched each file. Last touched is the latest commit date for that file. Common generated, documentation, media, and dependency files are excluded by the analysis filter.</p>
      <p>Paths are treated as recorded by Git. Renames are not joined into a single file identity, so activity before and after a rename may appear under different paths. A file absent from the list may also have been excluded by the file filters or limits.</p>
    </Disclosure>
    <Disclosure title="Included files and missing files">
      <p>History-based file metrics omit common generated, vendor, build, documentation, example, benchmark, specification, editor configuration, dependency-manifest, lock, media, and binary-style files. They also exclude common configuration names such as <code>.gitignore</code> and environment files. The filter is intended to focus the analysis on source changes; it can omit a meaningful file in a particular project.</p>
      <p>File processing is bounded to 10,000 observed paths, and the outline has a separate 300-file limit. Check the scan-coverage notice before interpreting absent rows as zero activity.</p>
    </Disclosure>
    <Disclosure title="Hotspot score">
      <p>Normalize each included file’s churn and current byte size separately from 0 to 1 using (value − repository minimum) ÷ (repository maximum − repository minimum). If all files have the same value, each receives 0.5. Average the two normalized values. Example: churn 0.75 and size 0.25 gives a score of 0.50. Scores are relative to this repository.</p>
      <p>A score can change when another file enters the comparison set, even if the selected file does not change. File size is the current checkout’s byte size; it is not the cumulative number of lines added and deleted in that file’s history. A low score does not imply low importance or absence of defects.</p>
    </Disclosure>
    <Disclosure title="Bug-associated files and commit share">
      <p>A commit is matched by its subject using case-insensitive whole words: “fix,” “bug,” “defect,” “error,” “issue,” “patch,” “repair,” “resolve,” “close,” or “crash.” Each included file touched in a matching commit receives one association.</p>
      <p><strong className="text-primary">Bug-fix count:</strong> matching commits that touched the file. <strong className="text-primary">Share:</strong> that file’s matching commit count ÷ all matching commits × 100. Example: 2 matching commits touching a file out of 10 matching commits gives 20%.</p>
    </Disclosure>
    <Disclosure title="Ownership and single-author flag">
      <p>For each file, count author emails in the analyzed recent-history window, up to 10,000 commits and 100 distinct authors per file. The dominant author has the highest count. The single-author flag is true when only one distinct author email appears in that window. Example: 8 commits by A and 2 by B means A is dominant and the file is not single-author.</p>
      <p>Git email identifies contributors, so aliases belonging to one person may be counted separately.</p>
      <p>Git paths before and after a rename are not consolidated. Author counts therefore describe the recorded path within the analyzed history and may differ from a team’s actual ownership arrangements.</p>
    </Disclosure>
    <Disclosure title="Co-change pairs and result limit">
      <p>Count commits where each pair of included files changed together in the analyzed recent-history window. Commits with more than 100 included files are capped for this calculation; the report marks this when it affects coverage. Pairs seen only once are removed; remaining pairs are sorted by count and capped at the top 200. Example: A and B changed together in 4 commits, so their count is 4. This is correlation, not proof of a required dependency.</p>
    </Disclosure>
    <Disclosure title="Code outline coverage">
      <p>The outline uses line-based patterns, not a full language parser, to find function and class declarations in TypeScript, JavaScript, Python, Java, C#, and Go. It scans up to 300 supported files and skips files larger than 500 KB. Complex syntax can be missed or misread.</p>
    </Disclosure>
    <Disclosure title="Health score, applicability, and category formulas">
      <p><strong className="text-primary">Overall score:</strong> equal-weight average of applicable category scores, rounded to a whole number. Not-applicable categories are excluded. A category is labeled healthy at 70 or above.</p>
      <p><strong className="text-primary">Project type:</strong> inferred from recognizable files and manifests, not by running code. Examples include JavaScript start/serve scripts or web framework dependencies for applications; package entry/export fields for libraries; <code>manage.py</code> or selected <code>src/main.*</code> files for applications; <code>src/lib.rs</code> for Rust libraries; and web SDK markers in C# project files. Other layouts may be unknown.</p>
      <p><strong className="text-primary">Change risk:</strong> a hotspot is a source file changed in at least 5 commits during the last 12 months. Score = max(0, round(100 − 300 × hotspot files ÷ source files changed in that period)). Example: 2 hotspots among 10 changed source files gives 40 points. This category is not scored if none changed in that period.</p>
      <p><strong className="text-primary">Tests:</strong> +50 for recognizable test files and +50 for recognized test configuration. <strong className="text-primary">Documentation:</strong> +60 for a README and +40 for other recognized docs. <strong className="text-primary">CI:</strong> 100 if a recognized CI file is found, otherwise 0.</p>
      <p><strong className="text-primary">Secret hygiene:</strong> 0 if a likely secret pattern is detected; otherwise 30 if a tracked environment file is found; otherwise 100. Sample/template environment files are excluded. Matched values are redacted. <strong className="text-primary">Container setup:</strong> for detected applications, 100 if Docker/Compose configuration is found, otherwise 0; libraries and unknown project types are not scored.</p>
      <p>Detection uses common names and conventions: tests in test/tests/spec/__tests__ folders or common test filenames/configs; docs folders or Markdown-like files; common GitHub, GitLab, CircleCI, Azure, Jenkins, and Buildkite files; and Dockerfile or Compose names. Custom conventions may be missed.</p>
    </Disclosure>
    <Disclosure title="Health history and secret-scan limits">
      <p>Health history uses up to 10,000 commits and charts up to 120 months. Each monthly point uses the last commit tree in that month. Each commit contributes at most 100 source paths to historical change signals; affected coverage is marked as truncated. Current and monthly repository checks prioritize at most 10,000 files. Historical file contents are not scanned, so past secret patterns are not part of trend scores; historical secret hygiene reflects only whether a tracked environment file was present.</p>
      <p>The current secret scan checks up to 2,000 files, 512 KB per file, and 20 MB total. It looks for private-key headers, common AWS/GitHub token shapes, and long credential assignments.</p>
    </Disclosure>
    <Disclosure title="Zero values, unavailable data, and not applicable">
      <p>A displayed zero means the calculation returned zero for the data it analyzed. “No data” means the file or signal is not present in that result set. “Not applicable” means the category is excluded from the Health average because the check does not apply or has no eligible data. These states should not be interpreted as interchangeable.</p>
      <p>When every file has the same churn or size value, that dimension receives 0.5 for all files. When there are no eligible files or commits, a metric may be empty or shown as zero; use the panel explanation and coverage notice to understand which case applies.</p>
    </Disclosure>
    <Disclosure title="Default branch, dates, and renames">
      <p>Git history calculations use commits reachable from the default branch in the clone. Commit activity and file dates use Git author dates, which may differ from when a change was merged or committed. Wot-Git does not combine a renamed path with its previous name, so file-level signals may be split across paths.</p>
    </Disclosure>
  </GuideCard>
}

const FAQS = [
  { q: "Does Wot-Git find and fix bugs?", a: "No. It associates files with commits whose messages look like bug fixes and highlights change patterns. It does not prove a defect exists, generate a patch, or verify a fix." },
  { q: "Is Wot-Git just guessing? What is this analysis for?", a: "Wot-Git calculates traceable signals from repository evidence: Git commit history, file sizes, co-changed paths, commit wording, and recognizable repository files. The calculations are repeatable, but the signals are imperfect proxies: a commit message can be misleading, a convention may go unrecognized, and finding test files does not tell whether tests pass. The purpose is to help you focus an investigation in a large codebase. Use the linked commits and files to check the evidence, then review the code and run the project’s tests. For example, a frequently changed, large file is a useful place to ask questions; that signal alone does not mean the file is defective." },
  { q: "Does Health run the repository’s tests?", a: "No. It checks for recognizable test files and configuration but does not install dependencies, execute tests, or build the repository." },
  { q: "Does a high Health score mean the repository is safe or good?", a: "No. It means the repository matched more of Wot-Git’s static checklist signals. It is not a security audit, quality guarantee, or substitute for review." },
  { q: "Why is a Health category marked not applicable?", a: "Some checks do not fit every repository. For example, container setup is not scored for libraries or unknown project types, and change risk is not scored when no source files changed in the measured period. Not-applicable categories are left out of the overall average." },
  { q: "Why can a score change between analyses?", a: "Repository files, commit history, and the comparison set can change. Hotspots are relative to the repository’s included files; Health also uses a rolling 12-month change window and the current revision’s static files." },
  { q: "How are Health trends calculated?", a: "Wot-Git reconstructs up to 120 monthly points from recent Git history, using the last commit tree in each month. It is a limited historical estimate; old file contents are not scanned for secret patterns." },
  { q: "Can Wot-Git detect every exposed secret?", a: "No. It checks selected text/config files in the current revision for a small set of common patterns and has file and byte limits. It can miss secrets and can flag false positives. Matched values are redacted from results." },
  { q: "Why might a signal be missing or wrong?", a: "Wot-Git recognizes common names, extensions, commit-message words, and configuration files. Different conventions, aliases, generated files, limited history, and unsupported language syntax affect results." },
  { q: "Why does the report say scan coverage is limited?", a: "Wot-Git caps history at 10,000 recent commits, the analyzed file set at 10,000 files, commit and co-change file lists at 100 included files per commit, ownership at 100 authors per file, and the outline at 300 files. It also stops after 3 minutes and limits temporary checkouts to 1 GiB. Limited metrics are labeled so you can account for missing older history or files." },
  { q: "Can I get a fresh report instead of a cached one?", a: "Yes. Use the refresh control in the repository header to bypass the dashboard cache and scan the public repository again. The normal cache lifetime remains 6 hours for the combined dashboard." },
  { q: "Can I analyze a private repository?", a: "No. The current service accepts public GitHub repositories only." },
  { q: "Does Wot-Git change repository files?", a: "No. It clones the public repository for analysis, removes its temporary clone afterward, and does not push changes or open pull requests." },
  { q: "Does Wot-Git store my report?", a: "The API caches analysis results in process memory for up to 24 hours and Health results for up to 6 hours. The combined dashboard response uses a 6-hour cache. Cached data disappears when the API process restarts. Temporary clone directories are removed after scans." },
  { q: "Why does the report not include every commit or file?", a: "Analysis has commit and file filters and explicit history or outline limits. Git history uses at most 10,000 recent commits and the code outline scans up to 300 supported files. See Calculations for exact coverage." },
  { q: "Does Wot-Git analyze every branch, pull request, or uncommitted change?", a: "No. The scan clones the repository’s default branch and analyzes the committed repository state available there. It does not inspect other branches, pull requests, local working-tree changes, or uncommitted files." },
  { q: "Why is a file missing from Churn, Hotspots, or Ownership?", a: "The file may match an excluded path or file type, have no changes in the bounded history, fall beyond the 10,000-file analysis limit, or be affected by a rename. Check the coverage notice and the Calculations section for the file filters and limits." },
  { q: "Does file size mean lines of code?", a: "No. Hotspot size is the current file size in bytes. Commit-size metrics separately use inserted plus deleted lines from Git numstat." },
  { q: "Why did a hotspot score change when the file did not?", a: "Hotspot scores are normalized against the other included files. Changes to the comparison set, file sizes, or history can change a file’s relative score." },
  { q: "Does co-change mean two files depend on each other?", a: "No. It means the files appeared together in multiple commits in the analyzed history. They may be related, but the pattern can also come from broad commits or project conventions." },
  { q: "Why does a contributor appear more than once?", a: "Ownership uses Git author email addresses. One person who committed using multiple addresses can appear as multiple recorded authors; Wot-Git does not merge identities." },
  { q: "Does renaming a file preserve its full history?", a: "Wot-Git counts file paths as recorded in commits and does not join rename history into one continuous file identity. Activity may therefore be split between old and new paths." },
  { q: "Does finding a test folder mean tests pass?", a: "No. Health checks for recognizable test files and configuration names only. It does not install dependencies or run a test suite." },
  { q: "Does a missing Docker finding mean I should add Docker?", a: "No. The check is a static presence signal and applies only to repositories classified as applications. Whether Docker is useful depends on how the project is developed and distributed." },
  { q: "What happens if the scan times out or a repository is too large?", a: "Cloning is limited to 60 seconds, a complete scan to three minutes, and the temporary checkout to 1 GiB. A hard limit can stop the scan with an error; history or file-level caps instead produce partial-coverage metadata when results can still be returned." },
  { q: "Why are the results different after Refresh?", a: "Refresh bypasses the combined dashboard cache and scans the repository again. The default branch may have advanced, or the prior report may have been cached. Scans can also produce partial data if limits are reached." },
  { q: "Can a clean Health result prove that the repository has no secrets?", a: "No. Secret checks look for selected patterns in a bounded set of current-revision files. They can miss unfamiliar formats, encoded values, secrets outside scanned files, and anything present only in historical versions." },
  { q: "What is the difference between zero, no data, and not applicable?", a: "Zero is a calculated value for the data the check analyzed. No data means the expected records are absent from that result set, possibly because of filters or limits. Not applicable means the check is excluded from the Health average because it does not fit the repository type or has no eligible data." },
  { q: "Can I use Wot-Git to compare two repositories?", a: "Treat comparisons as exploratory. Hotspots are normalized within each repository, and Health scores are checklist averages rather than calibrated benchmarks across project types." },
  { q: "Why does Git show a different date from the dashboard?", a: "Commit activity uses Git author dates. Author and committer dates can differ, and a commit’s author date may not be the date it was merged into the default branch." },
  { q: "Why are configuration files or documentation absent from file metrics?", a: "The history-based file filter intentionally excludes many documentation, manifest, lock, media, and configuration files to focus on selected source changes. Health checks use a separate static-file scan, so the same file can appear in Health evidence but not in churn or hotspot results." },
  { q: "Why is Health different from the other analysis views?", a: "Health combines static checks of recognized files with bounded Git-history signals. It does not run tests or inspect runtime behavior, and some categories are excluded when they do not apply." },
  { q: "What does the project-type estimate mean?", a: "It is inferred from common manifests and file patterns. It can be unknown or misclassified when a project uses an unusual layout; Wot-Git does not install or run the repository to determine its type." },
  { q: "Can I analyze a fork or a repository with submodules?", a: "Public GitHub repositories are accepted. The report reflects the repository URL and default branch you submitted; it should not be assumed to include history or files stored in other repositories or unavailable through the clone." },
]

function FAQ() {
  return <GuideCard title="Frequently asked questions">
    <p>These answers describe what the current implementation does. See Calculations for formulas and coverage limits.</p>
    {FAQS.map(({ q, a }) => <Disclosure key={q} title={q}><p>{a}</p></Disclosure>)}
  </GuideCard>
}

function UsageTerms() {
  return <GuideCard title="Plain-language usage terms">
    <p>Use Wot-Git as a review aid and decision-support tool. Check important findings against the repository and your own tests before acting on them. Scores and labels are heuristic; they are not guaranteed to be complete or correct.</p>
    <Disclosure title="What users should expect">
      <p>Only submit public repositories you have a right to analyze. Do not treat a clean report as proof that software is secure, correct, or ready to ship. Wot-Git does not modify a repository or replace code review, testing, or security assessment.</p>
      <p>This page explains product behavior in plain language. It is not a legally reviewed Terms of Service document.</p>
    </Disclosure>
  </GuideCard>
}

function DataPrivacy() {
  return <GuideCard title="Data and privacy">
    <Disclosure title="Repository handling and caching">
      <div className="flex items-start gap-2"><Database size={16} className="mt-1 shrink-0 text-accent" /><p>The API clones a public GitHub repository into a temporary directory (up to 1 GiB) and removes that directory after analysis. A clone is limited to 60 seconds and a complete scan to 3 minutes. Separate analysis results are cached in process memory for up to 24 hours and Health results for up to 6 hours. The combined dashboard response is cached for 6 hours; the repository-header refresh control bypasses that cache. Cache contents disappear when the API process restarts.</p></div>
    </Disclosure>
    <Disclosure title="Secret scanning">
      <div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-accent" /><p>Health scans selected text/config files in the current revision for a small set of credential patterns. It reports the file and line, redacts matched values, and does not scan historical file contents for secrets. It does not run repository scripts or tests.</p></div>
    </Disclosure>
    <Disclosure title="Information sent to Wot-Git and GitHub">
      <div className="flex items-start gap-2"><CircleHelp size={16} className="mt-1 shrink-0 text-accent" /><p>Repository search suggestions are requested from GitHub’s public search API in your browser. The repository URL submitted for analysis is sent to the Wot-Git API. Only public GitHub repositories are supported.</p></div>
    </Disclosure>
  </GuideCard>
}

export function ProjectGuide({ standalone = false, initialSection = "how-to-read", onSectionChange }: { standalone?: boolean; initialSection?: GuideSectionId; onSectionChange?: (section: GuideSectionId) => void }) {
  const [activeTab, setActiveTab] = useState<GuideTabId>(initialSection)
  const selectSection = (section: GuideTabId) => {
    if (section !== activeTab) window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    setActiveTab(section)
    onSectionChange?.(section)
  }
  const panel = {
    "how-to-read": <HowToRead />,
    calculations: <Calculations />,
    faq: <FAQ />,
    "usage-terms": <UsageTerms />,
    "data-privacy": <DataPrivacy />,
  }[activeTab]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {standalone && <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-primary"><ArrowLeft size={14} /> Back to Wot-Git</Link>}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent"><BookOpen size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Wot-Git Guide</span></div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Understand repository analysis</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted">Learn how to interpret signals, how calculations work, and what Wot-Git does with repository data. These are review clues, not guarantees.</p>
      </header>
      <div role="tablist" aria-label="Guide sections" className="flex gap-2 overflow-x-auto border-b border-border pb-2">
        {GUIDE_TABS.map(({ id, label }, index) => (
          <button key={id} id={`guide-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls="guide-panel" tabIndex={activeTab === id ? 0 : -1} onClick={() => selectSection(id)} onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % GUIDE_TABS.length : event.key === "ArrowLeft" ? (index - 1 + GUIDE_TABS.length) % GUIDE_TABS.length : event.key === "Home" ? 0 : event.key === "End" ? GUIDE_TABS.length - 1 : -1
            if (next >= 0) {
              event.preventDefault()
              const target = GUIDE_TABS[next]
              selectSection(target.id)
              document.getElementById(`guide-tab-${target.id}`)?.focus()
            }
          }} className={`shrink-0 border px-3 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${activeTab === id ? "border-accent/50 bg-accent/10 text-accent" : "border-transparent text-muted hover:border-border hover:bg-surface hover:text-primary"}`}>
            {label}
          </button>
        ))}
      </div>
      <section id="guide-panel" role="tabpanel" aria-labelledby={`guide-tab-${activeTab}`} tabIndex={0} className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {panel}
        <p className="px-1 text-[11px] leading-5 text-muted">Methodology reflects the current Wot-Git implementation and may change as the project evolves.</p>
      </section>
    </div>
  )
}
