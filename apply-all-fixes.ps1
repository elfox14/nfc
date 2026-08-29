# apply-all-fixes.ps1
# NFC Project — Apply all remaining fixes in one script
# Run this in your nfc repo root directory
# Usage:  powershell -ExecutionPolicy Bypass -File apply-all-fixes.ps1

$ErrorActionPreference = "Stop"
Write-Host "=== NFC Project — Applying All Remaining Fixes ===" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────
# 1. CLEANUP: Remove tracked patch/temp files
# ─────────────────────────────────────────────
Write-Host "[1/8] Cleaning up tracked temp files..." -ForegroundColor Yellow
$tempFiles = @("perf-fixes.patch", "seo-fixes.patch", "final-fixes.patch", "nfc-code-fixes.patch", "apply-fixes.ps1")
foreach ($f in $tempFiles) {
    if (Test-Path $f) {
        git rm --cached $f 2>$null
        Write-Host "  Untracked: $f"
    }
}
# Add to .gitignore if not already there
$gitignore = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue
foreach ($f in $tempFiles) {
    if ($gitignore -notmatch [regex]::Escape($f)) {
        Add-Content .gitignore $f
        Write-Host "  Added to .gitignore: $f"
    }
}

# ─────────────────────────────────────────────
# 2. .HTACCESS: Add mod_deflate + mod_expires
# ─────────────────────────────────────────────
Write-Host "`n[2/8] Adding gzip compression + caching to .htaccess..." -ForegroundColor Yellow
$htaccess = Get-Content .htaccess -Raw
if ($htaccess -notmatch "mod_deflate") {
    $compressionBlock = @"

# Gzip compression — reduces transfer size ~70%
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript
  AddOutputFilterByType DEFLATE application/javascript application/json application/xml
  AddOutputFilterByType DEFLATE image/svg+xml application/x-font-ttf application/font-woff application/font-woff2
</IfModule>

# Browser caching — static assets cached for 1 year, HTML for 1 hour
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 1 hour"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
  ExpiresByType application/x-font-ttf "access plus 1 year"
  ExpiresByType application/manifest+json "access plus 1 year"
</IfModule>

# Ensure charset for text files
AddDefaultCharset UTF-8
"@
    Add-Content .htaccess $compressionBlock
    Write-Host "  Added mod_deflate + mod_expires + AddDefaultCharset"
} else {
    Write-Host "  Already has mod_deflate — skipping"
}

# ─────────────────────────────────────────────
# 3. FONTS: Reduce from 10+ to 3 families
# ─────────────────────────────────────────────
Write-Host "`n[3/8] Reducing font families to 3 (Cairo + Poppins + Tajawal)..." -ForegroundColor Yellow
$unifiedFont = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"
$fontPattern = '<link[^>]*href="https://fonts\.googleapis\.com/css2\?[^"]*"[^>]*>'
$htmlFiles = Get-ChildItem *.html
$fontCount = 0
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -notmatch 'fonts\.googleapis\.com/css2') { continue }
    
    # Remove all existing font CSS links
    $content = [regex]::Replace($content, $fontPattern, '')
    
    # Check if preconnect exists
    $hasPreconnect = $content -match 'rel="preconnect"[^>]*fonts\.googleapis'
    
    # Build replacement block
    $fontBlock = ""
    if (-not $hasPreconnect) {
        $fontBlock += "<link rel=""preconnect"" href=""https://fonts.googleapis.com"">`n"
        $fontBlock += "<link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>`n"
    }
    $fontBlock += "<link rel=""preload"" as=""style"" href=""$unifiedFont"" onload=""this.onload=null;this.rel='stylesheet'"">`n"
    $fontBlock += "<noscript><link rel=""stylesheet"" href=""$unifiedFont""></noscript>"
    
    # Insert after viewport meta
    if ($content -match '(<meta name="viewport"[^>]+>)') {
        $content = $content -replace '(<meta name="viewport"[^>]+>)', "`$1`n$fontBlock"
    } elseif ($content -match '(<meta charset[^>]+>)') {
        $content = $content -replace '(<meta charset[^>]+>)', "`$1`n$fontBlock"
    } else {
        $content = $content -replace '<head>', "<head>`n$fontBlock"
    }
    
    # Clean up empty lines
    $content = $content -replace "`n{3,}", "`n`n"
    
    Set-Content $file.FullName $content -NoNewline
    $fontCount++
}
Write-Host "  Updated $fontCount HTML files"

# ─────────────────────────────────────────────
# 4. DEFER: Add defer to blocking scripts in editor
# ─────────────────────────────────────────────
Write-Host "`n[4/8] Adding defer to blocking scripts in editor.html + editor-en.html..." -ForegroundColor Yellow
$editorFiles = @("editor.html", "editor-en.html")
foreach ($file in $editorFiles) {
    if (-not (Test-Path $file)) { continue }
    $content = Get-Content $file -Raw
    
    $replacements = @(
        @('<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js" defer></script>'),
        @('<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js" defer></script>'),
        @('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>'),
        @('<script src="toolbar-tab-nav.js"></script>', '<script src="toolbar-tab-nav.js" defer></script>'),
        @('<script src="js/sw-register.js"></script>', '<script src="js/sw-register.js" defer></script>')
    )
    
    $changed = $false
    foreach ($r in $replacements) {
        if ($content -match [regex]::Escape($r[0])) {
            $content = $content -replace [regex]::Escape($r[0]), $r[1]
            $changed = $true
        }
    }
    
    if ($changed) {
        Set-Content $file $content -NoNewline
        Write-Host "  Fixed: $file"
    } else {
        Write-Host "  Already fixed (or not found): $file"
    }
}

# ─────────────────────────────────────────────
# 5. INLINE SCRIPTS: Externalize blog page scripts
# ─────────────────────────────────────────────
Write-Host "`n[5/8] Externalizing remaining inline scripts in blog pages..." -ForegroundColor Yellow
$blogFiles = Get-ChildItem blog*.html, nfc-for-*.html, how-to-use-editor*.html 2>$null
$extCount = 0
foreach ($file in $blogFiles) {
    $content = Get-Content $file -Raw
    if ($content -notmatch '<script>(?!.*application/ld\+json)') { continue }
    
    # Match inline scripts that are NOT JSON-LD and NOT src
    $pattern = '(?s)<script>(?!\s*<!--)(?!.*?type=["'']application/ld\+json)(.*?)</script>'
    $matches = [regex]::Matches($content, $pattern)
    
    if ($matches.Count -eq 0) { continue }
    
    $pageName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $scriptIdx = 0
    $newFiles = @()
    
    foreach ($m in $matches) {
        $scriptContent = $m.Groups[1].Value.Trim()
        if ([string]::IsNullOrWhiteSpace($scriptContent)) { continue }
        
        # Check if it's a shared script (GTM, gtag, SW)
        if ($scriptContent -match 'googletagmanager|gtm\.start') {
            $content = $content.Replace($m.Value, '<script src="js/gtm-bootstrap.js"></script>')
            continue
        }
        if ($scriptContent -match "gtag\('js'|gtag\('config'") {
            $content = $content.Replace($m.Value, '<script src="js/gtag-config.js"></script>')
            continue
        }
        if ($scriptContent -match 'serviceWorker.*register') {
            $content = $content.Replace($m.Value, '<script src="js/sw-register.js"></script>')
            continue
        }
        
        # Custom script — extract to external file
        $hash = (Get-FileHash -InputStream ([System.IO.MemoryStream]::new([System.Text.Encoding]::UTF8.GetBytes($scriptContent))) -Algorithm SHA256).Hash.Substring(0,12)
        $jsFile = "js/${pageName}-${hash}.js"
        $jsPath = Join-Path $PWD $jsFile
        
        if (-not (Test-Path $jsPath)) {
            Set-Content $jsPath "$scriptContent`n" -NoNewline
            $newFiles += $jsFile
        }
        $content = $content.Replace($m.Value, "<script src=""$jsFile"" defer></script>")
        $scriptIdx++
    }
    
    if ($newFiles.Count -gt 0) {
        Set-Content $file.FullName $content -NoNewline
        $extCount++
        Write-Host "  $($file.Name): extracted $($newFiles.Count) scripts"
    }
}
Write-Host "  Total: $extCount files processed"

# ─────────────────────────────────────────────
# 6. SW PRECACHE: Update with js/ assets + bump version
# ─────────────────────────────────────────────
Write-Host "`n[6/8] Updating Service Worker precache + version..." -ForegroundColor Yellow
$swFile = "sw.original.js"
if (Test-Path $swFile) {
    $swContent = Get-Content $swFile -Raw
    
    # Bump cache version
    $swContent = $swContent -replace "const CACHE_VERSION = 'v\d+';", "const CACHE_VERSION = 'v7';"
    
    # Add js/ entries to precache if not present
    if ($swContent -notmatch "js/gtm-bootstrap") {
        $swContent = $swContent -replace "'/nfc/mcprime-logo-optimized.webp',", "'/nfc/mcprime-logo-optimized.webp',
  '/nfc/js/gtm-bootstrap.js',
  '/nfc/js/sw-register.js',
  '/nfc/js/gtag-config.js',"
    }
    
    Set-Content $swFile $swContent -NoNewline
    Write-Host "  Updated $swFile (version v7 + 3 js/ precache entries)"
}

# ─────────────────────────────────────────────
# 7. REBUILD ASSETS
# ─────────────────────────────────────────────
Write-Host "`n[7/8] Rebuilding generated assets..." -ForegroundColor Yellow
npm run build:assets 2>&1 | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: build:assets failed. Run 'npm ci' first." -ForegroundColor Red
} else {
    Write-Host "  Assets rebuilt successfully."
}

# ─────────────────────────────────────────────
# 8. VERIFY + COMMIT
# ─────────────────────────────────────────────
Write-Host "`n[8/8] Verifying and committing..." -ForegroundColor Yellow

# Verify
$inlineCount = (Get-ChildItem *.html | ForEach-Object { (Get-Content $_.FullName -Raw) | Select-String -Pattern '<script>(?!.*application/ld\+json)(?!.*src=)' -AllMatches | ForEach-Object { $_.Matches.Count } | Measure-Object -Sum).Sum
Write-Host "  Inline scripts remaining: $inlineCount (target: 0)"

$fontFamilies = (Get-ChildItem *.html | ForEach-Object { (Get-Content $_.FullName -Raw) | Select-String -Pattern 'family=([^&"]+)' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } } | Sort-Object -Unique).Count
Write-Host "  Unique font families: $fontFamilies (target: 3)"

$hasDeflate = (Get-Content .htaccess -Raw) -match "mod_deflate"
Write-Host "  .htaccess has mod_deflate: $hasDeflate"

# Commit
git add -A
git commit -m "Performance: gzip compression, font reduction to 3 families, defer blocking scripts, externalize blog inline scripts, SW precache update, cleanup temp files"
Write-Host ""
Write-Host "=== Done! Now push: ===" -ForegroundColor Green
Write-Host "  git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "Then verify the site at https://www.mcprim.com/nfc/editor.html" -ForegroundColor White
