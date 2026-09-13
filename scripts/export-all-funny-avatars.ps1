Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\mikol\.gemini\antigravity-ide\brain\0c568a31-bda6-4238-9197-c010b3b4c65e"
$img1Path = Join-Path $brainDir "funny_fantasy_avatars_collection_1789328888555.jpg"
$img2Path = Join-Path $brainDir "funny_fantasy_avatars_expansion_1789328909948.jpg"
$outDir = "C:\Users\mikol\.gemini\antigravity-ide\scratch\English\public\avatars"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

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
    Write-Host "Exported: $(Split-Path $destFile -Leaf)"
}

# --- 10 from Image 1, Rows 1 & 2 ---
Crop-Image $src1 58 36 210 230 (Join-Path $outDir "funny_barbarian.png")
Crop-Image $src1 324 36 210 230 (Join-Path $outDir "funny_duck_pilot.png")
Crop-Image $src1 588 36 210 230 (Join-Path $outDir "funny_tree_warrior.png")
Crop-Image $src1 852 36 210 230 (Join-Path $outDir "funny_knight.png")
Crop-Image $src1 1114 36 210 230 (Join-Path $outDir "funny_dragon_sleepy.png")

Crop-Image $src1 58 282 210 230 (Join-Path $outDir "funny_wizard.png")
Crop-Image $src1 324 282 210 230 (Join-Path $outDir "funny_ninja_cat.png")
Crop-Image $src1 588 282 210 230 (Join-Path $outDir "funny_pirate_frog.png")
Crop-Image $src1 852 282 210 230 (Join-Path $outDir "funny_goblin_engineer.png")
Crop-Image $src1 1114 282 210 230 (Join-Path $outDir "funny_tiny_giant.png")

# --- 7 from Image 1, Row 3 ---
Crop-Image $src1 42 524 175 230 (Join-Path $outDir "funny_castle.png")
Crop-Image $src1 228 524 175 230 (Join-Path $outDir "funny_chicken.png")
Crop-Image $src1 414 524 175 230 (Join-Path $outDir "funny_alien_cowboy.png")
Crop-Image $src1 600 524 175 230 (Join-Path $outDir "funny_prince.png")
Crop-Image $src1 786 524 175 230 (Join-Path $outDir "funny_queen.png")
Crop-Image $src1 972 524 175 230 (Join-Path $outDir "funny_dragon_rider.png")
Crop-Image $src1 1158 524 175 230 (Join-Path $outDir "funny_carriage.png")

# --- 5 from Image 2 (Expansion Set) ---
Crop-Image $src2 58 36 210 230 (Join-Path $outDir "funny_little_king.png")
Crop-Image $src2 324 36 210 230 (Join-Path $outDir "funny_jester.png")
Crop-Image $src2 588 36 210 230 (Join-Path $outDir "funny_heroic_cat.png")
Crop-Image $src2 852 36 210 230 (Join-Path $outDir "funny_talking_tree.png")
Crop-Image $src2 852 282 210 230 (Join-Path $outDir "funny_dragon_chef.png")

$src1.Dispose()
$src2.Dispose()

Write-Host "All 22 Funny Fantasy Character Avatars exported successfully!"
