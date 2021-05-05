function Show-TableData {
    param (
        [Parameter(Mandatory=$true)]
        [int]$TableNo
    )

    $Url = Get-WebClientUrl
    $Url += "&table=$TableNo"
    Start-Process $Url
}

Export-ModuleMember -Function Show-TableData