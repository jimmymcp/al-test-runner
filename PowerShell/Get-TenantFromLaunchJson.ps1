function Get-TenantFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName'),
        [Parameter(Mandatory=$false)]
        $LaunchConfig
    )
    
    $Tenant = Get-ValueFromLaunchJson -KeyName tenant -ConfigName $ConfigName -LaunchConfig $LaunchConfig

    return $Tenant
}

Export-ModuleMember -Function Get-TenantFromLaunchJson