"use client"
import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, BookOpen, ChevronDown, CircleHelp, Database, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <details className="group rounded-md border border-border bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
        <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-accent transition-transform group-open:rotate-180" />
        <span>{title}</span>
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3 text-sm leading-6 text-muted">{children}</div>
    </details>
  )
}

function HowToRead() {
  return <GuideCard title="How to read repository analysis">
    <p>Wot-Git turns Git history and recognizable repository files into review signals. Start with a question, then use the relevant view to inspect the evidence behind it. A signal tells you where to look; it does not prove a file is broken, safe, or well maintained.</p>
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
      <p>Use it to choose what to inspect next. Open the underlying commits and files, consider the repository’s conventions, and run the project’s own checks before making decisions.</p>
    </Disclosure>
  </GuideCard>
}

function Calculations() {
  return <GuideCard title="Calculations and examples">
    <p>Examples use invented small numbers. Some panels omit documentation, generated, media, dependency, or other non-source files according to their analysis filter.</p>
    <Disclosure title="Commit activity and analysis limits">
      <p>Commits are grouped by Git author date. The overview total is the sum of daily counts. Its distinct file total comes from the churn results. Example: 3 commits Monday plus 2 Tuesday gives 5 commits.</p>
      <p>Full analysis is capped at 50,000 commits. Repositories beyond that limit are rejected by the full analysis endpoint. Health history uses a separate limit of up to 20,000 recent commits.</p>
    </Disclosure>
    <Disclosure title="Commit sizes, median, buckets, and atomic ratio">
      <p><strong className="text-primary">Size per commit:</strong> inserted lines + deleted lines. Binary changes may have no line counts. The median is the middle size after sorting; for an even number of commits, the two middle values are averaged and rounded.</p>
      <p><strong className="text-primary">Atomic ratio:</strong> commits changing at most 50 lines ÷ all commits × 100. Example: 8 of 10 commits are at most 50 lines, so the ratio is 80%.</p>
      <p><strong className="text-primary">Buckets:</strong> Micro (&lt;10), Small (10–50), Medium (&gt;50–200), Large (&gt;200–500), Huge (&gt;500). Each bucket percentage is its commit count ÷ total commits × 100. The view also lists five largest commits and total inserted plus deleted lines.</p>
    </Disclosure>
    <Disclosure title="File churn and last touched">
      <p>File churn counts commits that touched each file. Last touched is the latest commit date for that file. Common generated, documentation, media, and dependency files are excluded by the analysis filter.</p>
    </Disclosure>
    <Disclosure title="Hotspot score">
      <p>Normalize each included file’s churn and current byte size separately from 0 to 1 using (value − repository minimum) ÷ (repository maximum − repository minimum). If all files have the same value, each receives 0.5. Average the two normalized values. Example: churn 0.75 and size 0.25 gives a score of 0.50. Scores are relative to this repository.</p>
    </Disclosure>
    <Disclosure title="Bug-associated files and commit share">
      <p>A commit is matched by its subject using a case-insensitive keyword matcher that may match inside longer words. Each included file touched in a matching commit receives one association.</p>
      <p><strong className="text-primary">Bug-fix count:</strong> matching commits that touched the file. <strong className="text-primary">Share:</strong> that file’s matching commit count ÷ all matching commits × 100. Example: 2 matching commits touching a file out of 10 matching commits gives 20%.</p>
    </Disclosure>
    <Disclosure title="Ownership and single-author flag">
      <p>For each file, count commits per author email across its history. The dominant author has the highest count. The single-author flag is true when only one distinct author email appears. Example: 8 commits by A and 2 by B means A is dominant and the file is not single-author.</p>
      <p>Git email identifies contributors, so aliases belonging to one person may be counted separately.</p>
    </Disclosure>
    <Disclosure title="Co-change pairs and result limit">
      <p>Count commits where each pair of included files changed together. Pairs seen only once are removed; remaining pairs are sorted by count and capped at the top 200. Example: A and B changed together in 4 commits, so their count is 4. This is correlation, not proof of a required dependency.</p>
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
      <p>Health history uses up to 20,000 commits and charts up to 120 months. Each monthly point uses the last commit tree in that month. Historical file contents are not scanned, so past secret patterns are not part of trend scores; historical secret hygiene reflects only whether a tracked environment file was present.</p>
      <p>The current secret scan checks up to 2,000 files, 512 KB per file, and 20 MB total. It looks for private-key headers, common AWS/GitHub token shapes, and long credential assignments.</p>
    </Disclosure>
  </GuideCard>
}

const FAQS = [
  { q: "Does Wot-Git find and fix bugs?", a: "No. It associates files with commits whose messages look like bug fixes and highlights change patterns. It does not prove a defect exists, generate a patch, or verify a fix." },
  { q: "Does Health run the repository’s tests?", a: "No. It checks for recognizable test files and configuration but does not install dependencies, execute tests, or build the repository." },
  { q: "Does a high Health score mean the repository is safe or good?", a: "No. It means the repository matched more of Wot-Git’s static checklist signals. It is not a security audit, quality guarantee, or substitute for review." },
  { q: "Why is a Health category marked not applicable?", a: "Some checks do not fit every repository. For example, container setup is not scored for libraries or unknown project types, and change risk is not scored when no source files changed in the measured period. Not-applicable categories are left out of the overall average." },
  { q: "Why can a score change between analyses?", a: "Repository files, commit history, and the comparison set can change. Hotspots are relative to the repository’s included files; Health also uses a rolling 12-month change window and the current revision’s static files." },
  { q: "How are Health trends calculated?", a: "Wot-Git reconstructs up to 120 monthly points from recent Git history, using the last commit tree in each month. It is a limited historical estimate; old file contents are not scanned for secret patterns." },
  { q: "Can Wot-Git detect every exposed secret?", a: "No. It checks selected text/config files in the current revision for a small set of common patterns and has file and byte limits. It can miss secrets and can flag false positives. Matched values are redacted from results." },
  { q: "Why might a signal be missing or wrong?", a: "Wot-Git recognizes common names, extensions, commit-message words, and configuration files. Different conventions, aliases, generated files, limited history, and unsupported language syntax affect results." },
  { q: "Can I analyze a private repository?", a: "No. The current service accepts public GitHub repositories only." },
  { q: "Does Wot-Git change repository files?", a: "No. It clones the public repository for analysis, removes its temporary clone afterward, and does not push changes or open pull requests." },
  { q: "Does Wot-Git store my report?", a: "The API caches analysis results in process memory for up to 24 hours and Health results for up to 6 hours. The combined dashboard response uses a 6-hour cache. Cached data disappears when the API process restarts. Temporary clone directories are removed after scans." },
  { q: "Why does the report not include every commit or file?", a: "Analysis has commit and file filters and explicit history or outline limits. Health trends use at most 20,000 commits and 120 months; the code outline scans up to 300 supported files. See Calculations for exact coverage." },
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
      <div className="flex items-start gap-2"><Database size={16} className="mt-1 shrink-0 text-accent" /><p>The API clones a public GitHub repository into a temporary directory and removes that directory after analysis. Separate analysis results are cached in process memory for up to 24 hours and Health results for up to 6 hours. The combined dashboard response is cached for 6 hours. Cache contents disappear when the API process restarts.</p></div>
    </Disclosure>
    <Disclosure title="Secret scanning">
      <div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-accent" /><p>Health scans selected text/config files in the current revision for a small set of credential patterns. It reports the file and line, redacts matched values, and does not scan historical file contents for secrets. It does not run repository scripts or tests.</p></div>
    </Disclosure>
    <Disclosure title="Information sent to Wot-Git and GitHub">
      <div className="flex items-start gap-2"><CircleHelp size={16} className="mt-1 shrink-0 text-accent" /><p>Repository search suggestions are requested from GitHub’s public search API in your browser. The repository URL submitted for analysis is sent to the Wot-Git API. Only public GitHub repositories are supported.</p></div>
    </Disclosure>
  </GuideCard>
}

export function ProjectGuide({ standalone = false }: { standalone?: boolean }) {
  const [activeTab, setActiveTab] = useState<GuideTabId>("how-to-read")
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
          <button key={id} id={`guide-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls="guide-panel" tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)} onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % GUIDE_TABS.length : event.key === "ArrowLeft" ? (index - 1 + GUIDE_TABS.length) % GUIDE_TABS.length : event.key === "Home" ? 0 : event.key === "End" ? GUIDE_TABS.length - 1 : -1
            if (next >= 0) {
              event.preventDefault()
              const target = GUIDE_TABS[next]
              setActiveTab(target.id)
              document.getElementById(`guide-tab-${target.id}`)?.focus()
            }
          }} className={`shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeTab === id ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface hover:text-primary"}`}>
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
