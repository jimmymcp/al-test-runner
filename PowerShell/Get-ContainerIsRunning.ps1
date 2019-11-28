function Get-ContainerIsRunning {
    Param(
        [Parameter(Mandatory=$true)]
        [string]$ContainerName
    )

    try {
        $StatusJson = docker inspect $ContainerName
        $StatusJson = [String]::Join([Environment]::NewLine, $StatusJson)
        $Status = ConvertFrom-Json $StatusJson

        if ($Status.Get(0).State.Running -eq 'True') {
            return $true
        }
    }
    catch {
        return $false
    }
}

Export-ModuleMember -Function Get-ContainerIsRunning
