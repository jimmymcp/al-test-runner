function Show-TableData {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TableName,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    $TableNo = Get-TableIDFromName -TableName $TableName -LaunchConfig $LaunchConfig
    $Url = Get-WebClientUrl -LaunchConfig $LaunchConfig
    $Url += "&table=$TableNo"
    Start-Process $Url
}

Export-ModuleMember -Function Show-TableData