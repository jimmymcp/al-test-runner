function Get-WebClientUrl {
    Param(
        [Parameter(Mandatory=$false)]
        $LaunchConfig
    )

    $Url = Get-ServerFromLaunchJson -IncludeProtocol -LaunchConfig $LaunchConfig
    if ($Url.Substring($Url.Length - 1) -ne '/') {
        $Url += '/'
    }

    $Url += Get-ValueFromLaunchJson -KeyName 'serverInstance' -LaunchConfig $LaunchConfig
    $Params = Get-ServiceUrl
    $Params = $Params.Substring($Params.IndexOf('?'))
    return "$Url/$Params&company=$(Get-ValueFromALTestRunnerConfig -KeyName companyName)"
}

Export-ModuleMember -Function Get-WebClientUrl