function Get-ContainerResultPath {
    param (
        [Parameter(Mandatory=$false)]
        [string]$ALTestRunnerConfigPath = (Get-ALTestRunnerConfigPath)
    )
    $ResultPath = Get-ValueFromALTestRunnerConfig -ConfigPath $ALTestRunnerConfigPath -KeyName 'containerResultPath'
    if (($ResultPath -eq '') -or ($null -eq $ResultPath)) {
        $ResultPath = (Get-BCContainerSharedFolders (Get-ServerFromLaunchJson)).Keys | Select-Object -First 1
        Set-ALTestRunnerConfigValue -KeyName 'containerResultPath' -KeyValue $ResultPath
    }

    return $ResultPath
}

Export-ModuleMember -Function Get-ContainerResultPath