$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\presentations\office-metadata.ps1')

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$outputDirectory = $PSScriptRoot
$brandDirectory = Join-Path $repositoryRoot 'docs\brand\exports'
$stem = 'OL-CERTIFICATE-TEMPLATE-en'
$powerPointPath = Join-Path $outputDirectory "$stem.pptx"
$pdfPath = Join-Path $outputDirectory "$stem.pdf"
$previewPath = Join-Path $outputDirectory "$stem.png"
$width = 297 / 25.4
$height = 210 / 25.4

function ConvertTo-OfficeColor {
    param([string]$Hex)
    $red = [Convert]::ToInt32($Hex.Substring(0, 2), 16)
    $green = [Convert]::ToInt32($Hex.Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($Hex.Substring(4, 2), 16)
    return $red + ($green -shl 8) + ($blue -shl 16)
}

function Add-CertificateText {
    param(
        $Slide,
        [string]$Name,
        [string]$Text,
        [double]$X,
        [double]$Y,
        [double]$W,
        [double]$H,
        [double]$Size,
        [string]$Color = '102A43',
        [switch]$Bold,
        [switch]$SingleLine
    )
    $shape = $Slide.Shapes.AddTextbox(1, $X * 72, $Y * 72, $W * 72, $H * 72)
    $shape.Name = $Name
    $frame = $shape.TextFrame2
    $frame.AutoSize = 0
    $frame.WordWrap = $(if ($SingleLine) { 0 } else { -1 })
    $frame.VerticalAnchor = 1
    $frame.MarginLeft = 0
    $frame.MarginRight = 0
    $frame.MarginTop = 0
    $frame.MarginBottom = 0
    $frame.TextRange.Text = $Text.Replace("`n", "`r")
    $frame.TextRange.Font.Name = 'Segoe UI'
    $frame.TextRange.Font.Size = $Size
    $frame.TextRange.Font.Bold = $(if ($Bold) { -1 } else { 0 })
    $frame.TextRange.Font.Fill.ForeColor.RGB = ConvertTo-OfficeColor $Color
    $frame.TextRange.ParagraphFormat.Alignment = 1
    $frame.TextRange.ParagraphFormat.SpaceAfter = 0
    if ($SingleLine) { $frame.AutoSize = 2 }
    $shape.TextFrame.TextRange.LanguageID = 1033
}

function Add-CertificateLogo {
    param(
        $Slide,
        [string]$File,
        [string]$Description,
        [double]$X,
        [double]$Y,
        [double]$VisibleWidth,
        [double]$PixelLeft,
        [double]$PixelTop,
        [double]$PixelWidth
    )
    $source = Join-Path $brandDirectory $File
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing approved logo: $source"
    }
    # Position the visible ink, not the transparent padding in the 2400 x 800 master.
    $imageWidth = $VisibleWidth * 2400 / $PixelWidth
    $imageHeight = $imageWidth / 3
    $left = $X - ($PixelLeft / 2400) * $imageWidth
    $top = $Y - ($PixelTop / 800) * $imageHeight
    $picture = $Slide.Shapes.AddPicture($source, 0, -1, $left * 72, $top * 72, $imageWidth * 72, $imageHeight * 72)
    $picture.Name = $Description
    $picture.AlternativeText = $Description
}

$existingPowerPoint = @(Get-Process | Where-Object { $_.ProcessName -eq 'POWERPNT' })
$application = $null
$presentation = $null
$alerts = $null

try {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $application = New-Object -ComObject PowerPoint.Application
    $alerts = $application.DisplayAlerts
    $application.DisplayAlerts = 1
    foreach ($open in $application.Presentations) {
        if ($open.FullName -eq $powerPointPath) {
            throw "Close the certificate template before rebuilding it: $powerPointPath"
        }
    }
    $presentation = $application.Presentations.Add(0)
    $presentation.PageSetup.SlideWidth = $width * 72
    $presentation.PageSetup.SlideHeight = $height * 72

    $slide = $presentation.Slides.Add(1, 12)
    $slide.Name = 'Certificate of Completion'
    $slide.FollowMasterBackground = 0
    $slide.Background.Fill.Solid()
    $slide.Background.Fill.ForeColor.RGB = ConvertTo-OfficeColor 'FFFFFF'

    $border = $slide.Shapes.AddShape(1, 0.45 * 72, 0.45 * 72, ($width - 0.9) * 72, ($height - 0.9) * 72)
    $border.Name = 'Certificate frame'
    $border.Fill.Visible = 0
    $border.Line.ForeColor.RGB = ConvertTo-OfficeColor '102A43'
    $border.Line.Weight = 0.8

    Add-CertificateLogo -Slide $slide -File 'operation-lighthouse-logo-color-light.png' `
        -Description 'Operation Lighthouse approved campaign logo' `
        -X 0.9 -Y 0.88 -VisibleWidth 4.0 -PixelLeft 336 -PixelTop 201 -PixelWidth 1778
    Add-CertificateLogo -Slide $slide -File 'mission-control-logo-color-light.png' `
        -Description 'Copilot Agent Mission Control approved platform logo' `
        -X ($width - 3.7) -Y 1.08 -VisibleWidth 2.8 -PixelLeft 144 -PixelTop 214 -PixelWidth 2112

    Add-CertificateText -Slide $slide -Name 'certificate-title' `
        -Text 'CERTIFICATE OF COMPLETION' -X 0.9 -Y 2.0 -W 9.8 -H 0.76 -Size 36 -Bold
    Add-CertificateText -Slide $slide -Name 'certificate-introduction' `
        -Text 'This certifies that' -X 0.9 -Y 3.12 -W 9.8 -H 0.3 -Size 14.5 -Color '526779'
    Add-CertificateText -Slide $slide -Name 'certificate-recipient' `
        -Text '[PARTICIPANT NAME]' -X 0.9 -Y 3.6 -W 9.8 -H 0.8 -Size 40 -Color '0F766E' -Bold -SingleLine
    Add-CertificateText -Slide $slide -Name 'certificate-completion-statement' `
        -Text "has completed the Operation Lighthouse workshop,`nwith full attendance and participation in the hands-on activities." `
        -X 0.9 -Y 4.7 -W 9.8 -H 0.8 -Size 18
    Add-CertificateText -Slide $slide -Name 'certificate-workshop-topic' `
        -Text 'Building agents with GitHub Copilot in VS Code' `
        -X 0.9 -Y 5.73 -W 9.8 -H 0.29 -Size 12.5 -Color '526779'

    Add-CertificateText -Slide $slide -Name 'certificate-date' `
        -Text '[COMPLETION DATE]' -X 0.9 -Y 6.65 -W 4.8 -H 0.35 -Size 16 -SingleLine
    Add-CertificateText -Slide $slide -Name 'certificate-date-label' `
        -Text 'COMPLETION DATE' -X 0.9 -Y 7.06 -W 4.8 -H 0.24 -Size 10.5 -Color '526779'

    $signature = $slide.Shapes.AddLine(6.5 * 72, 6.52 * 72, ($width - 0.9) * 72, 6.52 * 72)
    $signature.Name = 'Facilitator signature line'
    $signature.Line.ForeColor.RGB = ConvertTo-OfficeColor '526779'
    $signature.Line.Weight = 0.65
    Add-CertificateText -Slide $slide -Name 'certificate-facilitator' `
        -Text '[FACILITATOR NAME]' -X 6.5 -Y 6.65 -W ($width - 7.4) -H 0.35 -Size 16 -SingleLine
    Add-CertificateText -Slide $slide -Name 'certificate-facilitator-label' `
        -Text 'WORKSHOP FACILITATOR' -X 6.5 -Y 7.06 -W ($width - 7.4) -H 0.24 -Size 10.5 -Color '526779'
    Add-CertificateText -Slide $slide -Name 'certificate-credential-scope' `
        -Text 'Workshop completion certificate. Not an official GitHub certification.' `
        -X 0.9 -Y 7.49 -W 9.8 -H 0.22 -Size 9.5 -Color '526779'

    $noteBody = $null
    foreach ($shape in $slide.NotesPage.Shapes) {
        if ($shape.Type -eq 14 -and $shape.PlaceholderFormat.Type -eq 2) {
            $noteBody = $shape
            break
        }
    }
    if ($null -eq $noteBody) { throw 'The certificate has no speaker-notes body.' }
    $noteBody.TextFrame.TextRange.Text = @'
TEMPLATE - NOT AN ISSUED CERTIFICATE
Eligibility: full attendance at the workshop and participation in its hands-on activities.
Passing the core objectives of all five missions is not required. Advanced objectives are not required.
Replace [PARTICIPANT NAME], [COMPLETION DATE] and [FACILITATOR NAME] before issuing a personalized certificate.
Keep each field on one line. For long names or dates, reduce the font size as needed and check the exported PDF; do not rely on automatic fitting after a paste or scripted edit.
The facilitator verifies eligibility and signs. No signature, participant record, certificate number or verification service is fabricated.
Do not add contact-hour or accreditation claims without confirming the actual event.
Save a personalized copy and export that copy to PDF. Print on A4 landscape paper.
The text uses Segoe UI, matching the delivered workshop's local font fallback. Approved logo lettering is unchanged.
'@

    foreach ($shape in $slide.Shapes) {
        if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame2.HasText -eq -1) {
            $frame = $shape.TextFrame2
            if ($frame.TextRange.BoundHeight -gt $shape.Height + 2) {
                throw "Certificate text exceeds its frame: $($shape.Name)"
            }
            if ($frame.TextRange.BoundWidth -gt $shape.Width + 2) {
                throw "Certificate text exceeds its frame width: $($shape.Name)"
            }
        }
    }

    $presentation.SaveAs($powerPointPath, 24)
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    $presentation = $null
    Set-BrandedDocumentMetadata -Path $powerPointPath -Title 'Operation Lighthouse - Certificate of Completion'

    $presentation = $application.Presentations.Open($powerPointPath, -1, 0, 0)
    $presentation.SaveAs($pdfPath, 32)
    $presentation.Slides.Item(1).Export($previewPath, 'PNG', 1754, 1240)
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    $presentation = $null
    Write-Output "Created: $powerPointPath"
    Write-Output "Created: $pdfPath"
    Write-Output "Created: $previewPath"
}
finally {
    if ($null -ne $presentation) {
        $presentation.Saved = -1
        $presentation.Close()
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    }
    if ($null -ne $application) {
        if ($null -ne $alerts) { $application.DisplayAlerts = $alerts }
        if ($existingPowerPoint.Count -eq 0 -and $application.Presentations.Count -eq 0) {
            $application.Quit()
        }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($application)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
