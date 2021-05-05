function Get-WebClientUrl {
    $Url = Get-ServerFromLaunchJson -IncludeProtocol
    if ($Url.Substring($Url.Length) -ne '/') {
        $Url += '/'
    }

    $Url += Get-ValueFromLaunchJson -KeyName 'serverInstance'
    $Params = Get-ServiceUrl
    $Params = $Params.Substring($Params.IndexOf('?'))
    return $Url + $Params
}

Export-ModuleMember -Function Get-WebClientUrl