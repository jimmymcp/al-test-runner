function Get-CodeCoverage {
    $ServiceUrl = (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl')
    #TODO get the correct URL for the method to get the code coverage
    $ServiceUrl = "http://bc:7048/BC/ODataV4/TestRunner_GetCodeCoverage?company=My%20Company&tenant=default"
    $Credential = Get-ALTestRunnerCredential

    if (($null -eq $ServiceUrl) -or ('' -eq $ServiceUrl)) {
        throw 'Please set the OData url to the test runner service (testRunnerServiceUrl key in AL Test Runner config).'
    }

    try {
        $Result = (Invoke-WebRequest $ServiceUrl `
                -Credential $Credential `
                -Method Post `
                -ContentType application/json).Content | ConvertFrom-Json
        $CodeCoverage = ConvertFrom-Csv $Result.value -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits') | Sort-Object ObjectType, ObjectID, LineNo
        $CodeCoverageFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'codecoverage.json'
        Set-Content -Path $CodeCoverageFile -Value (ConvertTo-Json $CodeCoverage)
    }
    catch {
        try {
            $ErrorDetails = ConvertFrom-Json $_.ErrorDetails
            Write-Host $ErrorDetails.error.message -ForegroundColor DarkRed
        }
        catch {
            Write-Host $_ -ForegroundColor DarkRed
        }
    }
}

Export-ModuleMember -Function Get-CodeCoverage