# Read-only documentation checks. Run from any working directory.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$docsRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $docsRoot
$docFiles = @(Get-ChildItem -LiteralPath $docsRoot -Recurse -File -Filter '*.md')
$agentFile = Join-Path $repoRoot 'AGENTS.md'
if (Test-Path -LiteralPath $agentFile) {
    $docFiles += Get-Item -LiteralPath $agentFile
}
$failures = [System.Collections.Generic.List[string]]::new()
$linkCount = 0
$jsonCount = 0
$fence = ([string][char]96) * 3

foreach ($docFile in $docFiles) {
    $body = Get-Content -LiteralPath $docFile.FullName -Raw -Encoding UTF8
    if ([regex]::Matches($body, '(?m)^' + $fence).Count % 2 -ne 0) {
        $failures.Add("Unbalanced code fence: $($docFile.FullName)")
    }
    foreach ($match in [regex]::Matches($body, '\[[^\]]*\]\(([^)]+)\)')) {
        $target = $match.Groups[1].Value.Trim('<', '>')
        if ($target -match '^(https?://|mailto:|#)') { continue }
        $target = ($target -split '#', 2)[0]
        if (-not $target) { continue }
        $linkCount++
        $fullTarget = Join-Path $docFile.DirectoryName $target
        if (-not (Test-Path -LiteralPath $fullTarget)) {
            $failures.Add("Broken local link in $($docFile.Name): $target")
        }
    }
    foreach ($match in [regex]::Matches($body, '(?s)' + $fence + 'json\r?\n(.*?)\r?\n' + $fence)) {
        try {
            $null = $match.Groups[1].Value | ConvertFrom-Json -ErrorAction Stop
            $jsonCount++
        } catch {
            $failures.Add("Invalid JSON example in $($docFile.Name): $($_.Exception.Message)")
        }
    }
}

$definitionFiles = [ordered]@{
    REQ = 'PRD.md'
    BR = 'BUSINESS_RULES.md'
    BL = 'BACKLOG.md'
    T = 'TEST_PLAN.md'
    DEC = 'decisions/README.md'
    FUT = 'PRD.md'
}
$definitions = @{}
foreach ($prefix in $definitionFiles.Keys) {
    $pattern = if ($prefix -in @('REQ', 'BR', 'FUT')) {
        "\b$prefix-[A-Z]+-\d{3}\b"
    } else {
        "\b$prefix-\d{3}\b"
    }
    $definitionBody = Get-Content -LiteralPath (Join-Path $docsRoot $definitionFiles[$prefix]) -Raw -Encoding UTF8
    $rows = @([regex]::Matches($definitionBody, "(?m)^\| ($pattern) \|") | ForEach-Object { $_.Groups[1].Value })
    $defined = @($rows | Sort-Object -Unique)
    if ($rows.Count -ne $defined.Count) { $failures.Add("Duplicate $prefix definition rows") }
    if ($defined.Count -eq 0) { $failures.Add("No $prefix definitions found") }
    $definitions[$prefix] = $defined
    foreach ($docFile in $docFiles | Where-Object { $_.FullName -notmatch '[\\/]research[\\/]' }) {
        $body = Get-Content -LiteralPath $docFile.FullName -Raw -Encoding UTF8
        $used = @([regex]::Matches($body, $pattern) | ForEach-Object { $_.Value } | Sort-Object -Unique)
        foreach ($id in $used) {
            if ($id -notin $defined) { $failures.Add("Undefined $id in $($docFile.Name)") }
        }
    }
}

$traceBody = Get-Content -LiteralPath (Join-Path $docsRoot 'TRACEABILITY.md') -Raw -Encoding UTF8
$traceRows = @([regex]::Matches($traceBody, '(?m)^\| (REQ-[A-Z]+-\d{3}) \|([^\r\n]+)') )
$traceIds = @($traceRows | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
if ($traceRows.Count -ne $traceIds.Count) { $failures.Add('Duplicate traceability requirement rows') }
if (Compare-Object -ReferenceObject $definitions['REQ'] -DifferenceObject $traceIds) {
    $failures.Add('PRD and traceability requirement IDs differ')
}
foreach ($row in $traceRows) {
    $columns = $row.Groups[2].Value.Split('|')
    if ($columns.Count -ne 4 -or $columns[0] -notmatch '\bBR-' -or $columns[1] -notmatch '\bBL-' -or $columns[2] -notmatch '\bT-') {
        $failures.Add("Incomplete traceability mapping: $($row.Groups[1].Value)")
    }
}

Write-Output "Checked $($docFiles.Count) Markdown files, $linkCount local links and $jsonCount JSON examples."
Write-Output "Definitions: $($definitions['REQ'].Count) requirements, $($definitions['BR'].Count) rules, $($definitions['BL'].Count) backlog items, $($definitions['T'].Count) tests, $($definitions['DEC'].Count) decisions, $($definitions['FUT'].Count) future requirements."
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}
Write-Output 'PASS: documentation structure and ID coverage. Runtime behavior and semantic correctness were not tested.'
exit 0
