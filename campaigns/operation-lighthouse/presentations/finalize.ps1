$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'office-metadata.ps1')

$existingPowerPoint = @(Get-Process | Where-Object { $_.ProcessName -eq 'POWERPNT' })
$application = $null
$presentation = $null
$temporary = $null
$alerts = $null

try {
    $application = New-Object -ComObject PowerPoint.Application
    $alerts = $application.DisplayAlerts
    $application.DisplayAlerts = 1

    foreach ($name in @('OL-WORKSHOP-en.pptx', 'OL-FACILITATOR-en.pptx')) {
        $source = Join-Path $PSScriptRoot $name
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
            throw "Build the presentation before finalizing it: $source"
        }
        foreach ($open in $application.Presentations) {
            if ($open.FullName -eq $source) {
                throw "Close this presentation before finalizing it: $source"
            }
        }

        $temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("lighthouse-$([guid]::NewGuid().ToString('N')).pptx")
        $presentation = $application.Presentations.Open($source, -1, 0, 0)
        $presentation.SaveAs($temporary, 24)
        $presentation.Close()
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
        $presentation = $null

        Set-BrandedDocumentMetadata -Path $temporary
        Move-Item -LiteralPath $temporary -Destination $source -Force
        $temporary = $null
        Write-Output "Finalized: $name"
    }
}
finally {
    if ($null -ne $presentation) {
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
    if ($null -ne $temporary -and (Test-Path -LiteralPath $temporary -PathType Leaf)) {
        Remove-Item -LiteralPath $temporary
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
