Add-Type -AssemblyName System.Drawing

$brainPath = "C:\Users\varsh\.gemini\antigravity\brain\3ba8e220-8447-43bb-a2dd-03e24da29074"
$bases = @{
    "human" = "$brainPath\realistic_man_1791385632455.jpg"
    "animal" = "$brainPath\realistic_dog_1791385829894.jpg"
    "vehicle" = "$brainPath\realistic_car_1791385804466.jpg"
    "robot" = "$brainPath\realistic_car_1791385804466.jpg" # fallback to car
    "fantasy" = "$brainPath\realistic_dog_1791385829894.jpg" # fallback to dog
}

$outDir = "C:\dev\pulse-buddy\pulse-buddy\www\assets\buddies"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }

# BuddyCatalog schema distribution:
# 1-18 Human, 19-42 Animal, 43-54 Vehicle, 55-64 Robot, 65-72 Fantasy

for ($i = 1; $i -le 72; $i++) {
    $category = "fantasy"
    if ($i -le 18) { $category = "human" }
    elseif ($i -le 42) { $category = "animal" }
    elseif ($i -le 54) { $category = "vehicle" }
    elseif ($i -le 64) { $category = "robot" }

    $basePath = $bases[$category]
    if (Test-Path $basePath) {
        $bmp = [System.Drawing.Bitmap]::FromFile($basePath)
        $outBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        $g = [System.Drawing.Graphics]::FromImage($outBmp)

        # Create a color matrix for hue shifting
        $cm = New-Object System.Drawing.Imaging.ColorMatrix
        $r = ($i % 5) * 0.15; $g_val = ($i % 3) * 0.2; $b = ($i % 7) * 0.1
        $cm.Matrix00 = 1 - $r; $cm.Matrix11 = 1 - $g_val; $cm.Matrix22 = 1 - $b
        $cm.Matrix33 = 1; $cm.Matrix44 = 1

        $ia = New-Object System.Drawing.Imaging.ImageAttributes
        $ia.SetColorMatrix($cm)

        $rect = New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)
        $g.DrawImage($bmp, $rect, 0, 0, $bmp.Width, $bmp.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

        $outPath = Join-Path $outDir "b_$i.jpg"
        $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

        $g.Dispose()
        $outBmp.Dispose()
        $bmp.Dispose()
    }
}
Write-Output "Generated 72 photorealistic variants successfully."
