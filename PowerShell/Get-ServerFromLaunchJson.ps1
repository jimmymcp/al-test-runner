function Get-ServerFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName')
    )
    
    $Server = Get-ValueFromLaunchJson -KeyName server -ConfigName $ConfigName
    $Server = $Server.Substring($Server.IndexOf('://') + 3)
    if ($Server.Substring($Server.length - 1) -eq '/') {
        $Server = $Server.Substring(0,$Server.length - 1)
    }

    return $Server
}

Export-ModuleMember -Function Get-ServerFromLaunchJson