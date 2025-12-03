
param (
    [string]$SourceImagePath,
    [string]$DestinationDirectory
)

Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$Source,
        [string]$Destination,
        [int]$Size
    )

    $srcImage = [System.Drawing.Image]::FromFile($Source)
    $destImage = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)

    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graphics.DrawImage($srcImage, 0, 0, $Size, $Size)
    
    $destImage.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destImage.Dispose()
    $srcImage.Dispose()
    
    Write-Host "Created $Destination ($Size x $Size)"
}

# Ensure destination exists
if (!(Test-Path -Path $DestinationDirectory)) {
    New-Item -ItemType Directory -Path $DestinationDirectory | Out-Null
}

# Define sizes
$sizes = @(16, 32, 64, 80, 128)

foreach ($size in $sizes) {
    $destPath = Join-Path -Path $DestinationDirectory -ChildPath "icon-$size.png"
    Resize-Image -Source $SourceImagePath -Destination $destPath -Size $size
}

# Also create logo-filled.png (using 128px size for now or original)
$logoPath = Join-Path -Path $DestinationDirectory -ChildPath "logo-filled.png"
Copy-Item -Path $SourceImagePath -Destination $logoPath -Force
Write-Host "Created logo-filled.png"
