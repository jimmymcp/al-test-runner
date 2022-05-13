function Get-DockerHostIsRemote {
    $dockerHost = Get-ValueFromALTestRunnerConfig -KeyName 'dockerHost'
    if (($null -ne $dockerHost) -and ($dockerHost -ne '')) {
        return $true
    }
    else {
        return $false
    }
}

Export-ModuleMember -Function Get-DockerHostIsRemote