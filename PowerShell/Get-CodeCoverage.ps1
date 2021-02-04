function Get-CodeCoverage {
    $ServiceUrl = Get-ServiceUrl -Method 'GetCodeCoverage'
    $Credential = Get-ALTestRunnerCredential

    $CodeCoverageFile = Get-ValueFromALTestRunnerConfig -KeyName 'codeCoveragePath'
    Write-Host "Downloading code coverage to $CodeCoverageFile"

    try {
        $Result = (Invoke-WebRequest $ServiceUrl `
                -Credential $Credential `
                -Method Post `
                -ContentType application/json).Content | ConvertFrom-Json
        $CodeCoverage = ConvertFrom-Csv $Result.value -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits') | Sort-Object ObjectType, ObjectID, LineNo
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