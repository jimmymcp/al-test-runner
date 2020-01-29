function Invoke-CommandOnDockerHost {
    Param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$Command,
        [Parameter(Mandatory=$false)]
        $Parameters
    )

    if (Get-DockerHostIsRemote) {
        $Job = Invoke-Command -Session (Get-DockerHostSession) -ScriptBlock $Command -ArgumentList $Parameters -AsJob
        Receive-Job -Job $Job -Wait
    }
    else {
        Invoke-Command -ScriptBlock $Command -ArgumentList $Parameters
    }
}

Export-ModuleMember -Function Invoke-CommandOnDockerHost