function Get-DockerHostSession {
    $Session = Get-PSSession -ComputerName (Get-ValueFromALTestRunnerConfig -KeyName dockerHost) -State Opened
    if ($null -eq $Session) {

        $Script = "New-PSSession -ComputerName $(Get-ValueFromALTestRunnerConfig -KeyName 'dockerHost') "
        
        if (!([string]::IsNullOrEmpty((Get-ValueFromALTestRunnerConfig -KeyName vmUserName)))) {
            $Script = '$Credential =' + "[pscredential]::new($(Get-ValueFromALTestRunnerConfig -KeyName vmUserName), $(Get-ValueFromALTestRunnerConfig -KeyName vmSecurePassword));" + $Script
            $Script += '-Credential = $Credential '
        }
        

        if (!([string]::IsNullOrEmpty((Get-ValueFromALTestRunnerConfig -KeyName newPSSessionOptions)))) {
            $Script += (Get-ValueFromALTestRunnerConfig -KeyName newPSSessionOptions)
        } 

        return Invoke-Script $Script
    }
    
    return $Session
}

Export-ModuleMember -Function Get-DockerHostSession