function Get-ContainerIsRunning {
    Param(
        [Parameter(Mandatory = $true)]
        [string]$ContainerName
    )

    Invoke-CommandOnDockerHost {
        Param($ContainerName)
        try {
            $StatusJson = docker inspect $ContainerName
            $StatusJson = [String]::Join([Environment]::NewLine, $StatusJson)
            $Status = ConvertFrom-Json $StatusJson

            if ($PSVersionTable.PSVersion.Major -ge 7) {
                return $Status.State.Running
            }
            elseif ($Status.Get(0).State.Running -eq 'True') {
                return $true
            }
        }
        catch {
            return $false
        }
    } -Parameters $ContainerName
}

Export-ModuleMember -Function Get-ContainerIsRunning
