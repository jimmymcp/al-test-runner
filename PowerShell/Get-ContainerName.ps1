function Get-ContainerName {
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
        Get-ServerFromLaunchJson
    }
}

Export-ModuleMember -Function Get-ContainerName