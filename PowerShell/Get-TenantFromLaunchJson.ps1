function Get-TenantFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName')
    )
    
    $Tenant = Get-ValueFromLaunchJson -KeyName tenant -ConfigName $ConfigName

    return $Tenant
}

Export-ModuleMember -Function Get-TenantFromLaunchJson