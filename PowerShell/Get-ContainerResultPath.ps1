function Get-ContainerResultPath {
    param (
        [Parameter(Mandatory=$false)]
        [string]$ALTestRunnerConfigPath = (Get-ALTestRunnerConfigPath),
        [Parameter(Mandatory=$false)]
        $ContainerName = (Get-ServerFromLaunchJson),
        [Parameter(Mandatory=$true)]
        [ValidateSet("Local","Remote")]
        [string]$ExecutionMethod,
        [Parameter(Mandatory=$false)]
        [System.Management.Automation.Runspaces.PSSession]$Session
    )
    $ResultPath = Get-ValueFromALTestRunnerConfig -ConfigPath $ALTestRunnerConfigPath -KeyName 'containerResultPath'
    if (($ResultPath -eq '') -or ($null -eq $ResultPath)) {
        if($ExecutionMethod -eq "Remote") {
            $containerResultPathBlock=
            {
                param
                (
                    $ContainerName = $args[0]
                )

                return (Get-BCContainerSharedFolders -containerName $ContainerName).Keys | Select-Object -First 1 
            }
            
            $containerResultPathJob = Invoke-Command -Session $Session -ScriptBlock $containerResultPathBlock -ArgumentList $ContainerName -AsJob
            $ResultPath = Receive-Job -Job $containerResultPathJob -Wait
        } else {
            $ResultPath = (Get-BCContainerSharedFolders (Get-ServerFromLaunchJson)).Keys | Select-Object -First 1   
        }
        Set-ALTestRunnerConfigValue -KeyName 'containerResultPath' -KeyValue $ResultPath
    }

    return $ResultPath
}

Export-ModuleMember -Function Get-ContainerResultPath