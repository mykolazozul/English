Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\mikol\.gemini\antigravity-ide\brain\0c568a31-bda6-4238-9197-c010b3b4c65e"
$img1Path = Join-Path $brainDir "funny_fantasy_avatars_collection_1789328888555.jpg"
$outDir = "C:\Users\mikol\.gemini\antigravity-ide\scratch\English\public\avatars"

$src1 = [System.Drawing.Bitmap]::FromFile($img1Path)

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
}

Crop-Image $src1 58 36 210 230 (Join-Path $outDir "calib_barbarian.png")
Crop-Image $src1 324 36 210 230 (Join-Path $outDir "calib_duck.png")
Crop-Image $src1 588 36 210 230 (Join-Path $outDir "calib_tree.png")
Crop-Image $src1 852 36 210 230 (Join-Path $outDir "calib_knight.png")
Crop-Image $src1 1114 36 210 230 (Join-Path $outDir "calib_dragon.png")

# Row 2 test: y = 282, h = 230
Crop-Image $src1 58 282 210 230 (Join-Path $outDir "calib_wizard.png")
Crop-Image $src1 324 282 210 230 (Join-Path $outDir "calib_ninja_cat.png")
Crop-Image $src1 588 282 210 230 (Join-Path $outDir "calib_pirate_frog.png")
Crop-Image $src1 852 282 210 230 (Join-Path $outDir "calib_goblin.png")
Crop-Image $src1 1114 282 210 230 (Join-Path $outDir "calib_tiny_giant.png")

$src1.Dispose()
Write-Host "Row 1 and Row 2 calibrated!"
