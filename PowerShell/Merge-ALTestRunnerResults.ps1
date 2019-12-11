function Merge-ALTestRunnerTestResults {
    Param(
        [Parameter(Mandatory = $true)]
        [string]$ResultsFile,
        [Parameter(Mandatory = $false)]
        [string]$ToPath = (Split-Path (Get-ALTestRunnerConfigPath) -Parent)  
    )

    if (!(Test-Path $ToPath)) {
        New-Item -ItemType Directory -Path $ToPath | Out-Null
    }

    [xml]$FromResults = Get-Content $ResultsFile -Raw

    foreach ($FromCodeunit in $FromResults.assemblies.assembly) {        
        $ToResultFile = Join-Path $ToPath (($FromCodeunit.Attributes.GetNamedItem('name').Value + ".xml").Split([IO.Path]::GetInvalidFileNameChars()) -join '')
        if (Test-Path $ToResultFile) {
            [Xml]$ToCodeunit = Get-Content $ToResultFile
        
            foreach ($FromTest in $FromCodeunit.collection.test) {
                $OldToTest = $ToCodeunit.SelectSingleNode(("/assembly/collection/test[@name='{0}']" -f $FromTest.name))
                $NewToTest = $ToCodeunit.ImportNode($FromTest, $true)
                if ($null -eq $OldToTest) {
                    $ToCodeunit.FirstChild.FirstChild.AppendChild($NewToTest) | Out-Null
                }
                else {                    
                    $ToCodeunit.FirstChild.FirstChild.InsertAfter($NewToTest, $OldToTest) | Out-Null
                    $ToCodeunit.FirstChild.FirstChild.RemoveChild($OldToTest) | Out-Null
                }
            }        
            $ToCodeunit.Save($ToResultFile)
        }
        else {
            Set-Content -Path $ToResultFile -Value $FromCodeunit.OuterXml
        }
    }
}

Export-ModuleMember -Function Merge-ALTestRunnerTestResults