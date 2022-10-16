function Get-TestRunnerIsInstalled {
    param (
        [string]$ContainerName
    )

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