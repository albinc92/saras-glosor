# Beskär en bild till 4:5 (porträtt) och sparar JPG i bredderna 400, 800 och 1200.
# Används av tools/hamta_bilder.js: pwsh tools/skala.ps1 <in> <ut-prefix>  ->  <ut-prefix>-<w>.jpg
param([string]$In, [string]$Ut)
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($In)
try {
  # Vrid enligt EXIF så att stående foton blir stående
  if ($src.PropertyIdList -contains 0x0112) {
    switch ($src.GetPropertyItem(0x0112).Value[0]) {
      3 { $src.RotateFlip('Rotate180FlipNone') }
      6 { $src.RotateFlip('Rotate90FlipNone') }
      8 { $src.RotateFlip('Rotate270FlipNone') }
    }
  }
  # Största 4:5-utsnittet, centrerat (lite ovanför mitten i höjdled)
  $w = $src.Width; $h = $src.Height
  if ($w * 5 -gt $h * 4) { $cw = [int]($h * 4 / 5); $ch = $h } else { $cw = $w; $ch = [int]($w * 5 / 4) }
  $cx = [int](($w - $cw) / 2); $cy = [int](($h - $ch) * 0.45)

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 80L

  foreach ($bw in 400, 800, 1200) {
    $bh = [int]($bw * 5 / 4)
    $bmp = New-Object System.Drawing.Bitmap $bw, $bh
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $bw, $bh), (New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch), 'Pixel')
    $bmp.Save("$Ut-$bw.jpg", $codec, $ep)
    $g.Dispose(); $bmp.Dispose()
  }
} finally { $src.Dispose() }
