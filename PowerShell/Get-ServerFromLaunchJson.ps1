function Get-ServerFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName')
    )
    
    $Server = Get-ValueFromLaunchJson -KeyName server -ConfigName $ConfigName
    $Server = $Server.Substring($Server.IndexOf('://') + 3)
    $Server.ToUpper()
}

Export-ModuleMember -Function Get-ServerFromLaunchJson