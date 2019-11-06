function Get-ALTestRunnerCredential {
    $UserName = Get-ValueFromALTestRunnerConfig -KeyName 'userName'
    $SecurePwd = Get-ValueFromALTestRunnerConfig -KeyName 'securePassword'

    if (($UserName -eq '') -or ($SecurePwd -eq '')) {
        $Credential = Get-Credential -UserName $UserName -Message 'Please enter the credential to connect to BC'
        Set-ALTestRunnerCredential -Credential $Credential
        return $Credential
    }
    else {        
        return [pscredential]::new($UserName, (ConvertTo-SecureString $SecurePwd))
    }
}

Export-ModuleMember -Function Get-ALTestRunnerCredential