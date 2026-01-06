function Get-CodeCoverage {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    $ServiceUrl = Get-ServiceUrl -Method 'GetCodeCoverage' -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig

    $CodeCoverageFile = Get-ValueFromALTestRunnerConfig -KeyName 'codeCoveragePath'
    if ([string]::IsNullOrEmpty($CodeCoverageFile)) {
        Write-Host "AL Test Runner WARNING: Code coverage is enabled but codeCoveragePath is not set in AL Test Runner config.json file. See https://jpearson.blog/2021/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/ for more information." -ForegroundColor DarkRed
        return
    }

    # Ensure the directory exists
    $CodeCoverageDir = Split-Path -Path $CodeCoverageFile -Parent
    if (-not (Test-Path $CodeCoverageDir)) {
        New-Item -Path $CodeCoverageDir -ItemType Directory -Force | Out-Null
    }

    # Resolve to absolute path for output
    $ResolvedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($CodeCoverageFile)

    Write-Host "Downloading code coverage to $ResolvedPath"

    if (Get-UrlIsForOData $ServiceUrl) {
        $Params = @{
            Uri         = $ServiceUrl
            Credential  = $Credential
            Method      = 'Post'
            ContentType = 'application/json'
        }
        $Result = (Invoke-InvokeWebRequest $Params).Content | ConvertFrom-Json
        $CodeCoverage = ConvertFrom-Csv $Result.value -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits')
    }
    else {
        $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner"><soapenv:Header/><soapenv:Body><tes:GetCodeCoverage/></soapenv:Body></soapenv:Envelope>'
        $Headers = (@{SOAPAction = 'Read' })
        $Params = @{
            Uri         = $ServiceUrl
            Method      = 'Post'
            ContentType = 'application/xml'
            Body        = $Body
            Headers     = $Headers
            Credential  = $Credential
        }

        $Result = (Invoke-InvokeWebRequest $Params).Content
        [xml]$ResultXml = $Result
        $Result = $ResultXml.Envelope.Body.GetCodeCoverage_Result.InnerText
        $CodeCoverage = ConvertFrom-Csv $Result -Header ('ObjectType', 'ObjectID', 'LineType', 'LineNo', 'NoOfHits')
    }

    Set-Content -Path $CodeCoverageFile -Value (ConvertTo-Json $CodeCoverage)
}

Export-ModuleMember -Function Get-CodeCoverage