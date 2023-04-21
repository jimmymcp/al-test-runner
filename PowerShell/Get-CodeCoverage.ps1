function Get-CodeCoverage {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    $ServiceUrl = Get-ServiceUrl -Method 'GetCodeCoverage' -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig

    $CodeCoverageFile = Get-ValueFromALTestRunnerConfig -KeyName 'codeCoveragePath'
    if ([string]::IsNullOrEmpty($CodeCoverageFile)) {
        Write-Host "Please set a value for codeCoveragePath in the AL Test Runner config.json file." -ForegroundColor DarkRed
        Write-Host "See https://jpearson.blog/2021/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/ for more information." -ForegroundColor DarkRed
        return
    }

    Write-Host "Downloading code coverage to $CodeCoverageFile"

    $Params = @{
        Uri         = $ServiceUrl
        Credential  = $Credential
        Method      = 'Post'
        ContentType = 'application/json'
    }
    $Result = (Invoke-InvokeWebRequest $Params).Content | ConvertFrom-Json
    $CodeCoverage = ConvertFrom-Csv $Result.value -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits')
    Set-Content -Path $CodeCoverageFile -Value (ConvertTo-Json $CodeCoverage)
}

Export-ModuleMember -Function Get-CodeCoverage