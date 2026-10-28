param(
  [string]$AudioPath = "$PSScriptRoot\narration-homme.mp3",
  [string]$OutputPath = "$PSScriptRoot\..\..\deliverables\Walikale_Papeterie_Presentation_90s_Voix_Homme.mp4"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\..\.."
$ffmpeg = Join-Path $root "node_modules\ffmpeg-static\ffmpeg.exe"
$slides = Join-Path $PSScriptRoot "slides"
$screens = Join-Path $PSScriptRoot "screens"
$partsDir = Join-Path $PSScriptRoot "presentation-parts"
$list = Join-Path $PSScriptRoot "presentation-parts.txt"

if (!(Test-Path $ffmpeg)) { throw "FFmpeg est introuvable." }
if (!(Test-Path $AudioPath)) { throw "La voix masculine est introuvable." }

$sequence = @(
  @{ file = (Join-Path $slides "slide-01.png"); duration = 5 },
  @{ file = (Join-Path $screens "01-connexion.png"); duration = 8 },
  @{ file = (Join-Path $screens "02-tableau-de-bord.png"); duration = 13 },
  @{ file = (Join-Path $screens "03-produits.png"); duration = 10 },
  @{ file = (Join-Path $screens "04-approvisionnement.png"); duration = 11 },
  @{ file = (Join-Path $screens "05-ventes.png"); duration = 12 },
  @{ file = (Join-Path $screens "06-rapports.png"); duration = 12 },
  @{ file = (Join-Path $screens "07-cybercafe.png"); duration = 12 },
  @{ file = (Join-Path $slides "slide-09.png"); duration = 7 }
)

foreach ($entry in $sequence) {
  if (!(Test-Path $entry.file)) { throw "Capture introuvable : $($entry.file)" }
}

New-Item -ItemType Directory -Force $partsDir | Out-Null
$partPaths = @()
for ($index = 0; $index -lt $sequence.Count; $index++) {
  $entry = $sequence[$index]
  $partPath = Join-Path $partsDir ("part-{0:D2}.mp4" -f ($index + 1))
  & $ffmpeg -y -loop 1 -i $entry.file -t $entry.duration -r 30 `
    -vf "scale=1560:-2:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f44,format=yuv420p" `
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an $partPath
  if ($LASTEXITCODE -ne 0) { throw "La preparation de la capture $($index + 1) a echoue." }
  $partPaths += $partPath
}

$lines = $partPaths | ForEach-Object { "file '$($_.Replace('\', '/'))'" }
Set-Content -Path $list -Value $lines -Encoding ascii

& $ffmpeg -y -f concat -safe 0 -i $list -i $AudioPath -filter:a "atempo=0.9318" `
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -t 90 -movflags +faststart $OutputPath

if ($LASTEXITCODE -ne 0) { throw "La creation de la video a echoue." }
