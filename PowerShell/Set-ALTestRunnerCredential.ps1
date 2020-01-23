function Set-ALTestRunnerCredential {
    Param(
        [Parameter(Mandatory=$true)]
        [pscredential]$Credential,
        [Parameter()]
        [switch]$VM
    )

    if ($VM.IsPresent) {
        Set-ALTestRunnerConfigValue -KeyName 'vmUserName' -KeyValue $Credential.UserName
        Set-ALTestRunnerConfigValue -KeyName 'vmSecurePassword' -KeyValue (ConvertFrom-SecureString $Credential.Password)
    } else {
        Set-ALTestRunnerConfigValue -KeyName 'userName' -KeyValue $Credential.UserName
        Set-ALTestRunnerConfigValue -KeyName 'securePassword' -KeyValue (ConvertFrom-SecureString $Credential.Password)
    }
}

Export-ModuleMember -Function Set-ALTestRunnerCredential