function Get-ContainerResultPath {
    param (
        [Parameter(Mandatory=$false)]
        [string]$ALTestRunnerConfigPath = (Get-ALTestRunnerConfigPath),
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    $ResultPath = Get-ValueFromALTestRunnerConfig -ConfigPath $ALTestRunnerConfigPath -KeyName 'containerResultPath'
    if (($ResultPath -eq '') -or ($null -eq $ResultPath)) {
        $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
        $ResultPath = Invoke-CommandOnDockerHost {Param($ContainerName) (Get-BCContainerSharedFolders $ContainerName).Keys | Where-Object {$_.Contains('ProgramData')} | Select-Object -First 1} -Parameters $ContainerName
        if ($null -eq $ResultPath) {
            $ResultPath = Invoke-CommandOnDockerHost {Param($ContainerName) (Get-BCContainerSharedFolders $ContainerName).Keys | Select-Object -First 1} -Parameters $ContainerName
        }
        Set-ALTestRunnerConfigValue -KeyName 'containerResultPath' -KeyValue $ResultPath
    }

    return $ResultPath
}

Export-ModuleMember -Function Get-ContainerResultPath