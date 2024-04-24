function Get-TestRunnerIsInstalled {
    param (
        [string]$ContainerName
    )

    # this takes ages, just return false and attempt to install the service app whenever the service url is not populated
    return $false

    Invoke-CommandOnDockerHost {
        Param($ContainerName)
        if ($null -eq (Get-BcContainerAppInfo $ContainerName | Where-Object Name -eq 'Test Runner Service')) {
            return $false
        } else {
            return $true
        }
    }  -Parameters $ContainerName
}

Export-ModuleMember -Function Get-TestRunnerIsInstalled