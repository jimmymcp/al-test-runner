function Get-ContainerIsRunning {
    Param(
        [Parameter(Mandatory=$true)]
        [string]$ContainerName,
        [Parameter(Mandatory=$true)]
        [ValidateSet("Local","Remote")]
        [string]$ExecutionMethod,
        [Parameter(Mandatory=$false)]
        [System.Management.Automation.Runspaces.PSSession]$Session
    )

    if ($ExecutionMethod -eq "Local") {
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
    } else {
        $getContainerRunning={
            param (
                $ContainerName = $args[0]
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

        $getContainerRunningJob = Invoke-Command -ScriptBlock $getContainerRunning -Session $Session -ArgumentList $ContainerName -AsJob
        return (Receive-Job -Job $getContainerRunningJob -Wait)
    }  
}

Export-ModuleMember -Function Get-ContainerIsRunning
