function Show-TableData {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TableName
    )

    $ServiceUrl = Get-ServiceUrl -Method GetTableIDFromName
    $Credential = Get-ALTestRunnerCredential

    try {
        $Result = Invoke-WebRequest $ServiceUrl `
            -Credential $Credential `
            -Method Post `
            -ContentType 'application/json'`
            -Body ("{`"tableName`": `"$TableName`"}") | ConvertFrom-Json
        $TableNo = $Result.value
        $Url = Get-WebClientUrl
        $Url += "&table=$TableNo"
        Start-Process $Url
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

Export-ModuleMember -Function Show-TableData