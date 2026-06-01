Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\assets\source\gpt-image-2\taiwan-recycling-replacement-sheet.png"
$assetDir = Resolve-Path (Join-Path $PSScriptRoot "..\assets\pixel")

$items = @(
  [pscustomobject]@{ Name = "blackBear";     X = 72;   Y = 165; W = 275; H = 300; OutW = 128; OutH = 128 },
  [pscustomobject]@{ Name = "trashMonster1"; X = 417;  Y = 218; W = 265; H = 250; OutW = 96;  OutH = 92  },
  [pscustomobject]@{ Name = "trashMonster2"; X = 724;  Y = 126; W = 325; H = 345; OutW = 128; OutH = 120 },
  [pscustomobject]@{ Name = "trashMonster3"; X = 1096; Y = 88;  W = 360; H = 382; OutW = 150; OutH = 140 },
  [pscustomobject]@{ Name = "recycleYard";   X = 330;  Y = 535; W = 845; H = 390; OutW = 384; OutH = 176 }
)

function Test-BackgroundLike {
  param([System.Drawing.Color]$Color)
  $dr = 255 - $Color.R
  $dg = $Color.G
  $db = 255 - $Color.B
  $distance = [Math]::Sqrt(($dr * $dr) + ($dg * $dg) + ($db * $db))
  return ($distance -lt 218) -or ($Color.R -gt 185 -and $Color.B -gt 170 -and $Color.G -lt 135)
}

function Test-TransparentNeighbor {
  param(
    [bool[]]$Mask,
    [int]$Width,
    [int]$Height,
    [int]$X,
    [int]$Y
  )

  for ($dy = -1; $dy -le 1; $dy++) {
    for ($dx = -1; $dx -le 1; $dx++) {
      if ($dx -eq 0 -and $dy -eq 0) { continue }
      $nx = $X + $dx
      $ny = $Y + $dy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $Width -or $ny -ge $Height) { return $true }
      if ($Mask[($ny * $Width) + $nx]) { return $true }
    }
  }
  return $false
}

$sheet = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))

foreach ($item in $items) {
  $width = [int]$item.W
  $height = [int]$item.H
  $pixels = New-Object "System.Drawing.Color[]" ($width * $height)
  $background = New-Object "bool[]" ($width * $height)
  $queue = New-Object "System.Collections.Generic.Queue[int]"

  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      $pixels[($y * $width) + $x] = $sheet.GetPixel($item.X + $x, $item.Y + $y)
    }
  }

  for ($x = 0; $x -lt $width; $x++) {
    $top = $x
    $bottom = (($height - 1) * $width) + $x
    if (-not $background[$top] -and (Test-BackgroundLike $pixels[$top])) {
      $background[$top] = $true
      $queue.Enqueue($top)
    }
    if (-not $background[$bottom] -and (Test-BackgroundLike $pixels[$bottom])) {
      $background[$bottom] = $true
      $queue.Enqueue($bottom)
    }
  }

  for ($y = 0; $y -lt $height; $y++) {
    $left = $y * $width
    $right = ($y * $width) + $width - 1
    if (-not $background[$left] -and (Test-BackgroundLike $pixels[$left])) {
      $background[$left] = $true
      $queue.Enqueue($left)
    }
    if (-not $background[$right] -and (Test-BackgroundLike $pixels[$right])) {
      $background[$right] = $true
      $queue.Enqueue($right)
    }
  }

  while ($queue.Count -gt 0) {
    $idx = [int]$queue.Dequeue()
    $x = $idx % $width
    $y = [Math]::Floor($idx / $width)

    if ($x -gt 0) {
      $next = $idx - 1
      if (-not $background[$next] -and (Test-BackgroundLike $pixels[$next])) {
        $background[$next] = $true
        $queue.Enqueue($next)
      }
    }
    if ($x -lt ($width - 1)) {
      $next = $idx + 1
      if (-not $background[$next] -and (Test-BackgroundLike $pixels[$next])) {
        $background[$next] = $true
        $queue.Enqueue($next)
      }
    }
    if ($y -gt 0) {
      $next = $idx - $width
      if (-not $background[$next] -and (Test-BackgroundLike $pixels[$next])) {
        $background[$next] = $true
        $queue.Enqueue($next)
      }
    }
    if ($y -lt ($height - 1)) {
      $next = $idx + $width
      if (-not $background[$next] -and (Test-BackgroundLike $pixels[$next])) {
        $background[$next] = $true
        $queue.Enqueue($next)
      }
    }
  }

  $crop = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      $idx = ($y * $width) + $x
      $color = $pixels[$idx]
      if ($background[$idx] -or (Test-BackgroundLike $color)) {
        $crop.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        continue
      }

      $r = [int]$color.R
      $g = [int]$color.G
      $b = [int]$color.B
      if ((Test-TransparentNeighbor $background $width $height $x $y) -and $r -gt ($g + 30) -and $b -gt ($g + 30)) {
        $r = [Math]::Min($r, [int]($g + (($r - $g) * 0.35) + 18))
        $b = [Math]::Min($b, [int]($g + (($b - $g) * 0.35) + 18))
      }

      $crop.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($color.A, $r, $g, $b))
    }
  }

  $output = New-Object System.Drawing.Bitmap $item.OutW, $item.OutH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.DrawImage($crop, 0, 0, $item.OutW, $item.OutH)
  $graphics.Dispose()

  $destination = Join-Path $assetDir.Path ($item.Name + ".png")
  $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
  $crop.Dispose()
}

$sheet.Dispose()
Write-Output "Generated replacement PNG assets."
