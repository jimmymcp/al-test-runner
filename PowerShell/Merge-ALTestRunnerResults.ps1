function Merge-ALTestRunnerTestResults {
    Param(
        [Parameter(Mandatory=$true)]
        [string]$FromFile,
        [Parameter(Mandatory=$true)]
        [string]$ToFile    
    )

    [xml]$FromResults = Get-Content $FromFile

    if (!(Test-Path $ToFile)) {
        Copy-Item $FromFile $ToFile
        return
    }
    else {
        [xml]$ToResults = Get-Content $ToFile
    }

    foreach ($FromCodeunit in $FromResults.assemblies.assembly) {
        $ToCodeunit = $ToResults.SelectSingleNode(("/assemblies/assembly[@name='{0}']" -f $FromCodeunit.name))
        if ($null -eq $ToCodeunit) {
            $ToCodeunit = $ToResults.ImportNode($FromCodeunit, $true)
            $ToResults.DocumentElement.AppendChild($ToCodeunit) | Out-Null
        }
        else {
            foreach ($FromTest in $FromCodeunit.collection.test) {
                $OldToTest = $ToCodeunit.SelectSingleNode(("collection/test[@name='{0}']" -f $FromTest.name))
                $NewToTest = $ToResults.ImportNode($FromTest, $true)
                if ($null -eq $OldToTest) {
                    $ToCodeunit.FirstChild.AppendChild($NewToTest) | Out-Null
                }
                else {                    
                    $ToCodeunit.FirstChild.InsertAfter($NewToTest, $OldToTest) | Out-Null
                    $ToCodeunit.FirstChild.RemoveChild($OldToTest) | Out-Null
                }
            }
        }
    }

    $ToResults.Save($ToFile)
}

Export-ModuleMember -Function Merge-ALTestRunnerTestResults