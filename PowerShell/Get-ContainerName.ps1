function Get-ContainerName {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )
    if (Get-DockerHostIsRemote) {
        $ContainerName = Get-ValueFromALTestRunnerConfig -KeyName remoteContainerName
        if ([string]::IsNullOrEmpty($ContainerName)) {
            Write-Host "Please enter the name of the remote container:" -ForegroundColor DarkYellow
            $ContainerName = Read-Host
            Set-ALTestRunnerConfigValue -KeyName 'remoteContainerName' -KeyValue $ContainerName
        }
        $ContainerName
    }
    else {
        Get-ServerFromLaunchJson -LaunchConfig $LaunchConfig
    }
}

Export-ModuleMember -Function Get-ContainerName