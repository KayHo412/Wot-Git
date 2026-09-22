# Wot-Git API — Testing Commands Reference

All commands below are for **PowerShell** (not Command Prompt).
To open PowerShell, type `powershell` in Command Prompt and press Enter.

---

## 1. Start the Server

Run this from the root of the project (`D:\project\Wot-Git`):

```powershell
pnpm dev
```

You should see:
```
Wot-Git API running on http://localhost:3001
```

Keep this terminal open. Open a second terminal for all commands below.

---

## 2. Check the Server is Alive

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

**What it does:** Sends a GET request to the `/health` endpoint.
**Expected response:** `status: ok`
**Use this to:** Confirm the server is running before sending analysis requests.

---

## 3. Run an Analysis and Save to File

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/analyze" -Method POST -ContentType "application/json" -Body '{"repoUrl": "https://github.com/expressjs/express"}' | ConvertTo-Json -Depth 10 | Out-File -FilePath "result.json" -Encoding utf8
```

**What it does:** Sends a POST request with a GitHub URL, converts the response to JSON, and saves it to `result.json` in your current folder.
**Use this to:** Inspect the full raw output of all 6 services.
**Note:** First run clones the repo and takes 30–60 seconds. Second run is instant (cached).

Open the file in VS Code:
```powershell
code result.json
```

---

## 4. Load Results into a Variable (for querying)

```powershell
$r = Invoke-RestMethod -Uri "http://localhost:3001/analyze" -Method POST -ContentType "application/json" -Body '{"repoUrl": "https://github.com/expressjs/express"}'
```

**What it does:** Sends the request and stores the parsed JSON response in `$r`.
**Use this to:** Query individual services without re-running the full command each time.
**Note:** Run this once per session. After that, use `$r` directly.

---

## 5. Query Each Service

### Commit Frequency
```powershell
$r.commits | Select-Object -First 10
```
Shows the first 10 entries of daily commit counts.
Each row = one day + how many commits landed that day.

---

### Commit Sizes
```powershell
$r.commitSizes | Select-Object -First 10
```
Shows the first 10 commits with their insertions and deletions.
Useful for spotting unusually large commits.

---

### File Churn
```powershell
$r.churn | Select-Object -First 10
```
Shows the 10 most frequently changed files.
Higher `churnCount` = file is touched more often = higher risk.

---

### Hotspots
```powershell
$r.hotspots | Select-Object -First 10
```
Shows the 10 files with the highest hotspot score.
Score is 0–1. Combines churn frequency + file size.
High score = large file that changes often = most dangerous code.

---

### Co-Change (File Coupling)
```powershell
$r.cochange | Select-Object -First 10
```
Shows the 10 file pairs most often committed together.
High count = these two files are tightly coupled even if they shouldn't be.

---

### Ownership — All Files
```powershell
$r.ownership | Select-Object -First 10
```
Shows the first 10 files with their list of authors and dominant author.

---

### Ownership — Bus Factor Files Only
```powershell
$r.ownership | Where-Object { $_.isBusFactor -eq $true } | Select-Object path, dominantAuthor
```
Shows only files owned by a single person.
`Where-Object` = filter (like SQL WHERE).
`$_` = the current item being checked.
`-eq $true` = equals true.
These are your bus factor risks.

---

### Ownership — Bus Factor, Excluding a Specific Author
```powershell
$r.ownership | Where-Object { $_.isBusFactor -eq $true -and $_.dominantAuthor -ne "tj@vision-media.ca" } | Select-Object path, dominantAuthor
```
Same as above but filters out a specific author.
`-and` = both conditions must be true.
`-ne` = not equal.
Use this to filter out historical/legacy owners and focus on current risk.

---

## PowerShell Concepts Used

| Concept | Meaning | Example |
|---|---|---|
| `$r` | Variable storing the response | `$r = Invoke-RestMethod ...` |
| `\|` (pipe) | Pass output to next command | `$r.commits \| Select-Object` |
| `Select-Object -First N` | Take only first N items | `-First 10` |
| `Select-Object col1, col2` | Show only specific columns | `Select-Object path, dominantAuthor` |
| `Where-Object { }` | Filter rows by condition | `Where-Object { $_.isBusFactor -eq $true }` |
| `$_` | The current item in a filter | `$_.dominantAuthor` |
| `-eq` | Equals | `$_.isBusFactor -eq $true` |
| `-ne` | Not equal | `$_.dominantAuthor -ne "someone"` |
| `-and` | Both conditions must be true | `condition1 -and condition2` |
| `ConvertTo-Json -Depth 10` | Convert object to JSON text | Used before saving to file |
| `Out-File -FilePath "x.json"` | Save output to a file | Saves result to disk |