Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\mikol\.gemini\antigravity-ide\brain\0c568a31-bda6-4238-9197-c010b3b4c65e"
$img1Path = Join-Path $brainDir "funny_fantasy_avatars_collection_1789328888555.jpg"
$img2Path = Join-Path $brainDir "funny_fantasy_avatars_expansion_1789328909948.jpg"

$outDir = "C:\Users\mikol\.gemini\antigravity-ide\scratch\English\public\avatars"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$img1 = [System.Drawing.Bitmap]::FromFile($img1Path)
Write-Host "Image 1 Dimensions: $($img1.Width) x $($img1.Height)"

$img2 = [System.Drawing.Bitmap]::FromFile($img2Path)
Write-Host "Image 2 Dimensions: $($img2.Width) x $($img2.Height)"

$img1.Dispose()
$img2.Dispose()
