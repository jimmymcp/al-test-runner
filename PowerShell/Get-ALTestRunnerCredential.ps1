function Get-ALTestRunnerCredential {
    $UserName = Get-ValueFromALTestRunnerConfig -KeyName 'userName'
    $SecurePwd = Get-ValueFromALTestRunnerConfig -KeyName 'securePassword'

    if (($UserName -eq '') -or ($SecurePwd -eq '')) {
        $Credential = Get-Credential -UserName $UserName -Message ('Please enter the credentials to connect to server {0}' -f (Get-ServerFromLaunchJson))
        if ($null -eq $Credential) {
            throw "Credentials not entered"
        }
        Set-ALTestRunnerCredential -Credential $Credential
        return $Credential
    }
    else {        
        return [pscredential]::new($UserName, (ConvertTo-SecureString $SecurePwd))
    }
}

Export-ModuleMember -Function Get-ALTestRunnerCredential