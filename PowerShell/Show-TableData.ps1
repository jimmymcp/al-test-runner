function Show-TableData {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TableName,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    $ServiceUrl = Get-ServiceUrl -Method GetTableIDFromName -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential

    $Params = @{
        Uri         = $ServiceUrl
        Credential  = $Credential
        Method      = 'Post' 
        ContentType = 'application/json'
        Body        = ("{`"tableName`": `"$TableName`"}")
    }
    $Result = Invoke-InvokeWebRequest $Params
    $Result = $Result | ConvertFrom-Json
    $TableNo = $Result.value
    $Url = Get-WebClientUrl -LaunchConfig $LaunchConfig
    $Url += "&table=$TableNo"
    Start-Process $Url
}

Export-ModuleMember -Function Show-TableData