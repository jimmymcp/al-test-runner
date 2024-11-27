function Get-TestRunnerIsInstalled {
    param (
        [string]$ServiceUrl
    )

    ## attempt to get the id of the custmomer table from the test runner service to test it is installed
    if ($ServiceUrl -eq '') {
        return $false
    }

    if (Get-UrlIsForOData $ServiceUrl) {
        try {
            $Params = @{
                Uri        = $ServiceUrl.Replace('/TestRunner', '/$metadata')
                Method     = 'Get'
                Credential = (Get-ALTestRunnerCredential)
            }
            Invoke-InvokeWebRequest $Params
            return $true
        }
        catch {
            Write-Host $_ -ForegroundColor DarkRed
            return $false
        }
    }
    else {
        try {
            $Params = @{
                Uri        = $ServiceUrl
                Method     = 'Get'
                Credential = (Get-ALTestRunnerCredential)
            }
            Invoke-InvokeWebRequest $Params | Out-Null
            return $true
        }
        catch {
            Write-Host $_ -ForegroundColor DarkRed
            return $false
        }
    }
}

Export-ModuleMember -Function Get-TestRunnerIsInstalled