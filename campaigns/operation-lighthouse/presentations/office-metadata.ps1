function Set-BrandedDocumentMetadata {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$Title
    )

    $archive = [System.IO.Compression.ZipFile]::Open(
        $Path,
        [System.IO.Compression.ZipArchiveMode]::Update
    )
    try {
        $entry = $archive.GetEntry('docProps/core.xml')
        if ($null -eq $entry) { throw 'The saved presentation has no core metadata.' }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try {
            $document = [System.Xml.XmlDocument]::new()
            $document.XmlResolver = $null
            $document.LoadXml($reader.ReadToEnd())
        }
        finally {
            $reader.Dispose()
        }

        $namespaces = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
        $namespaces.AddNamespace('cp', 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties')
        $namespaces.AddNamespace('dc', 'http://purl.org/dc/elements/1.1/')
        foreach ($field in @('dc:creator', 'cp:lastModifiedBy')) {
            $node = $document.SelectSingleNode("/cp:coreProperties/$field", $namespaces)
            if ($null -eq $node) { throw "The saved presentation is missing $field." }
            $node.InnerText = 'Copilot Agent Mission Control'
        }
        if ($Title) {
            $titleNode = $document.SelectSingleNode('/cp:coreProperties/dc:title', $namespaces)
            if ($null -eq $titleNode) {
                $titleNode = $document.CreateElement('dc', 'title', 'http://purl.org/dc/elements/1.1/')
                [void]$document.DocumentElement.AppendChild($titleNode)
            }
            $titleNode.InnerText = $Title
        }

        # Do not embed the local Office profile in redistributable files.
        $entry.Delete()
        $replacement = $archive.CreateEntry('docProps/core.xml', [System.IO.Compression.CompressionLevel]::Optimal)
        $stream = $replacement.Open()
        $writer = $null
        try {
            $settings = [System.Xml.XmlWriterSettings]::new()
            $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
            $writer = [System.Xml.XmlWriter]::Create($stream, $settings)
            $document.Save($writer)
        }
        finally {
            if ($null -ne $writer) { $writer.Dispose() }
            $stream.Dispose()
        }
    }
    finally {
        $archive.Dispose()
    }
}
