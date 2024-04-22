function Get-UrlIsForOData {
    param (
        [Parameter(Mandatory = $false)]
        [string]$Url
    )

    return $Url.ToLower().Contains('odata')
}

Export-ModuleMember -Function Get-UrlIsForOData