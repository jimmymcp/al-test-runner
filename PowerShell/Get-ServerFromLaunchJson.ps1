function Get-ServerFromLaunchJson {
    param (
        [Parameter(Mandatory = $false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName'),
        [Parameter(Mandatory = $false)]
        [switch]$IncludeProtocol,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    
    $Server = Get-ValueFromLaunchJson -KeyName server -ConfigName $ConfigName -LaunchConfig $LaunchConfig

    if ($Server.Substring($Server.IndexOf('://') + 1).Contains(':')) {
        $Server = $Server.Substring(0, $Server.LastIndexOf(':'))
    }

    if (!$IncludeProtocol.IsPresent) {
        $Server = $Server.Substring($Server.IndexOf('://') + 3)
        if ($Server.Substring($Server.length - 1) -eq '/') {
            $Server = $Server.Substring(0, $Server.length - 1)
        }
    }

    return $Server
}

Export-ModuleMember -Function Get-ServerFromLaunchJson