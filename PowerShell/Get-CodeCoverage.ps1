function Get-CodeCoverage {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    $ServiceUrl = Get-ServiceUrl -Method 'GetCodeCoverage' -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential

    $CodeCoverageFile = Get-ValueFromALTestRunnerConfig -KeyName 'codeCoveragePath'
    if ([string]::IsNullOrEmpty($CodeCoverageFile)) {
        Write-Host "Please set a value for codeCoveragePath in the AL Test Runner config.json file." -ForegroundColor DarkRed
        Write-Host "See https://jpearson.blog/2021/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/ for more information." -ForegroundColor DarkRed
        return
    }

    Write-Host "Downloading code coverage to $CodeCoverageFile"

    try {
        $Result = (Invoke-WebRequest $ServiceUrl `
                -Credential $Credential `
                -Method Post `
                -ContentType application/json).Content | ConvertFrom-Json
        $CodeCoverage = ConvertFrom-Csv $Result.value -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits')
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