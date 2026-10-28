param(
  [string]$AudioPath = "$PSScriptRoot\narration-fr.mp3",
  [string]$OutputPath = "$PSScriptRoot\..\..\deliverables\Walikale_Papeterie_Presentation_90s.mp4"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Resolve-Path "$PSScriptRoot\..\.."
$slidesDir = Join-Path $PSScriptRoot "slides"
$ffmpeg = Join-Path $root "node_modules\ffmpeg-static\ffmpeg.exe"
$logoPath = Join-Path $root "img\logo-walikale1.png"
New-Item -ItemType Directory -Force $slidesDir, (Split-Path $OutputPath) | Out-Null

$navy = [System.Drawing.Color]::FromArgb(9, 31, 68)
$blue = [System.Drawing.Color]::FromArgb(22, 123, 241)
$cyan = [System.Drawing.Color]::FromArgb(55, 212, 220)
$white = [System.Drawing.Color]::White
$muted = [System.Drawing.Color]::FromArgb(190, 211, 238)
$panel = [System.Drawing.Color]::FromArgb(24, 56, 105)

function Add-Text($g, $text, $font, $brush, $x, $y, $width, $height, $align = "Near") {
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::$align
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($text, $font, $brush, (New-Object System.Drawing.RectangleF($x, $y, $width, $height)), $format)
}

function Add-Pill($g, $text, $x, $y, $width) {
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(38, 96, 173))
  $g.FillRectangle($brush, $x, $y, $width, 52)
  Add-Text $g $text $script:fontSmall $script:whiteBrush ($x + 12) ($y + 4) ($width - 24) 44 "Center"
  $brush.Dispose()
}

$fontTitle = New-Object System.Drawing.Font("Segoe UI", 46, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Regular)
$fontCard = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font("Segoe UI", 19, [System.Drawing.FontStyle]::Regular)
$fontTiny = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$whiteBrush = New-Object System.Drawing.SolidBrush $white
$mutedBrush = New-Object System.Drawing.SolidBrush $muted
$blueBrush = New-Object System.Drawing.SolidBrush $blue

$scenes = @(
  @{ title = "Pilotez votre activite"; subtitle = "Walikale Papeterie`nGestion moderne des stocks, ventes et services"; items = @("Une solution pour travailler vite, mieux decider et grandir.") },
  @{ title = "Toute l activite dans un seul espace"; subtitle = "Des modules relies pour suivre votre entreprise au quotidien"; items = @("Produits", "Services", "Clients", "Depenses", "Ventes", "Utilisateurs") },
  @{ title = "Continuez a travailler hors ligne"; subtitle = "Chaque ordinateur garde ses donnees localement grace a SQLite"; items = @("Ventes sans internet", "Stock local", "Factures et tickets", "Sauvegardes locales") },
  @{ title = "Synchronisez et gardez le controle"; subtitle = "Des que la connexion revient, les donnees rejoignent Supabase"; items = @("Synchronisation par rubrique", "Suivi a distance", "Roles securises", "Historique des actions") },
  @{ title = "Ventes et services sans complication"; subtitle = "Produits, prestations seules, clients comptoir et factures professionnelles"; items = @("Calcul automatique", "Stock mis a jour", "PDF et impression", "References de facture") },
  @{ title = "Maitrisez le stock et les commandes"; subtitle = "Chaque approvisionnement est trace avec un numero de lot"; items = @("Lots generes et personnalisables", "Transport global par commande", "Alertes de stock", "Marge potentielle") },
  @{ title = "Des rapports qui expliquent l activite"; subtitle = "Les ventes et depenses sont comparees pour faciliter les decisions"; items = @("Solde net", "Interpretation automatique", "Periodes filtrables", "Export PDF") },
  @{ title = "Un module Cybercafe dedie"; subtitle = "Ne melangez plus les recettes internet avec les ventes de papeterie"; items = @("Total de caisse journalier", "Import Mikhmon", "Ecart caisse et analyse", "Graphiques utiles") },
  @{ title = "Pret pour votre organisation"; subtitle = "Walikale Papeterie vous aide a suivre, securiser et developper vos activites."; items = @("Desktop Windows", "Acces web", "Travail hors ligne", "Vision du responsable") }
)

for ($index = 0; $index -lt $scenes.Count; $index++) {
  $scene = $scenes[$index]
  $bitmap = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(0, 0, 1920, 1080)), $navy, $blue, 18
  $g.FillRectangle($gradient, 0, 0, 1920, 1080)
  $gradient.Dispose()

  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 255, 255, 255))), 1370, -180, 620, 620)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 55, 212, 220))), -140, 770, 540, 420)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 255, 255, 255))), 92, 112, 1736, 850)

  if (Test-Path $logoPath) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $g.DrawImage($logo, 112, 135, 138, 138)
    $logo.Dispose()
  }
  Add-Text $g "WALIKALE TO WORLD" $fontSmall $whiteBrush 280 145 500 40
  Add-Text $g "Gestion intelligente des activites" $fontTiny $mutedBrush 280 188 500 32
  Add-Text $g ("0{0}" -f ($index + 1)) $fontSmall $mutedBrush 1650 150 100 36 "Far"

  Add-Text $g $scene.title $fontTitle $whiteBrush 150 320 1620 150
  Add-Text $g $scene.subtitle $fontSub $mutedBrush 155 480 1450 125

  if ($index -eq 0) {
    Add-Pill $g "Stocks" 155 695 190
    Add-Pill $g "Ventes" 370 695 190
    Add-Pill $g "Services" 585 695 210
    Add-Pill $g "Rapports" 820 695 210
  } else {
    for ($itemIndex = 0; $itemIndex -lt $scene.items.Count; $itemIndex++) {
      $row = [math]::Floor($itemIndex / 2)
      $col = $itemIndex % 2
      $x = 155 + ($col * 610)
      $y = 680 + ($row * 105)
      $cardBrush = New-Object System.Drawing.SolidBrush $panel
      $g.FillRectangle($cardBrush, $x, $y, 560, 78)
      $cardBrush.Dispose()
      $g.FillEllipse($blueBrush, $x + 22, $y + 24, 28, 28)
      Add-Text $g $scene.items[$itemIndex] $fontCard $whiteBrush ($x + 75) ($y + 12) 455 52
    }
  }

  Add-Text $g "Une solution professionnelle pour les activites de Walikale to World" $fontTiny $mutedBrush 155 995 1500 30
  $path = Join-Path $slidesDir ("slide-{0:D2}.png" -f ($index + 1))
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bitmap.Dispose()
}

$concat = Join-Path $slidesDir "slides.txt"
$lines = @()
Get-ChildItem $slidesDir -Filter "slide-*.png" | Sort-Object Name | ForEach-Object {
  $lines += "file '$($_.FullName.Replace('\', '/'))'"
  $lines += "duration 10"
}
$lines += "file '$((Get-ChildItem $slidesDir -Filter 'slide-09.png').FullName.Replace('\', '/'))'"
Set-Content -Path $concat -Value $lines -Encoding ascii

& $ffmpeg -y -f concat -safe 0 -i $concat -i $AudioPath -filter_complex "[0:v]fps=30,format=yuv420p[v];[1:a]atempo=0.9296[a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -t 90 -movflags +faststart $OutputPath
if ($LASTEXITCODE -ne 0) { throw "La creation de la video a echoue." }
