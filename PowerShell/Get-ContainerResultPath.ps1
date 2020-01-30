function Get-ContainerResultPath {
    param (
        [Parameter(Mandatory=$false)]
        [string]$ALTestRunnerConfigPath = (Get-ALTestRunnerConfigPath)
    )
    $ResultPath = Get-ValueFromALTestRunnerConfig -ConfigPath $ALTestRunnerConfigPath -KeyName 'containerResultPath'
    if (($ResultPath -eq '') -or ($null -eq $ResultPath)) {
        $ContainerName = Get-ContainerNAme
        $ResultPath = Invoke-CommandOnDockerHost {Param($ContainerName) (Get-BCContainerSharedFolders $ContainerName).Keys | Select-Object -First 1} -Parameters $ContainerName
        Set-ALTestRunnerConfigValue -KeyName 'containerResultPath' -KeyValue $ResultPath
    }

    return $ResultPath
}

Export-ModuleMember -Function Get-ContainerResultPath