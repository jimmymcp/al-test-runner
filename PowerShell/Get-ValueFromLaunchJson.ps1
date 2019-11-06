function Get-ValueFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        [string]$LaunchJsonPath = (Get-LaunchJsonPath),
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName'),
        [Parameter(Mandatory=$true)]
        $KeyName
    )
    
    $LaunchJson = ConvertFrom-Json (Get-Content -Path $LaunchJsonPath -Raw)
    ($LaunchJson.configurations | Where-Object name -eq $ConfigName).$KeyName
}

Export-ModuleMember -Function Get-ValueFromLaunchJson