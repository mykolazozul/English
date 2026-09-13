Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\mikol\.gemini\antigravity-ide\brain\0c568a31-bda6-4238-9197-c010b3b4c65e"
$img1Path = Join-Path $brainDir "funny_fantasy_avatars_collection_1789328888555.jpg"
$img2Path = Join-Path $brainDir "funny_fantasy_avatars_expansion_1789328909948.jpg"

$outDir = "C:\Users\mikol\.gemini\antigravity-ide\scratch\English\public\avatars"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$src1 = [System.Drawing.Bitmap]::FromFile($img1Path)
$src2 = [System.Drawing.Bitmap]::FromFile($img2Path)

function Crop-Image($source, $x, $y, $w, $h, $destFile) {
    $rect = [System.Drawing.Rectangle]::new([int]$x, [int]$y, [int]$w, [int]$h)
    $dest = [System.Drawing.Bitmap]::new([int]$w, [int]$h)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, [int]$w, [int]$h), $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $dest.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Saved: $destFile"
}

# Image 1 Grid layout:
# Width = 1376, Height = 768
# Row 1: y = 50, height = 205
# Col 1: x = 52, width = 212
# Col 2: x = 312, width = 212
# Col 3: x = 582, width = 212
# Col 4: x = 852, width = 212
# Col 5: x = 1112, width = 212

Crop-Image $src1 52 50 212 205 (Join-Path $outDir "test_r1c1.png")
Crop-Image $src1 312 50 212 205 (Join-Path $outDir "test_r1c2.png")
Crop-Image $src1 582 50 212 205 (Join-Path $outDir "test_r1c3.png")

$src1.Dispose()
$src2.Dispose()
