
Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Users\TheFo\Downloads\nfc\mcprime-logo-transparent.png"
$destPath = "c:\Users\TheFo\Downloads\nfc\mcprime-logo-optimized.png"

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found: $sourcePath"
    exit 1
}

# Delete destination if it exists
if (Test-Path $destPath) {
    Remove-Item $destPath -Force
}

$image = [System.Drawing.Image]::FromFile($sourcePath)
try {
    # Calculate new height to maintain aspect ratio
    $newWidth = 150
    $newHeight = [Math]::Round(($image.Height / $image.Width) * $newWidth)
    
    $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $graph = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # High quality settings
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graph.DrawImage($image, 0, 0, $newWidth, $newHeight)
    
    $bitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Image resized and saved to $destPath"
}
finally {
    if ($image) { $image.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($graph) { $graph.Dispose() }
}
