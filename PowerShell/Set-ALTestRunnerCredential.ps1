function Set-ALTestRunnerCredential {
    Param(
        [Parameter(Mandatory=$true)]
        [pscredential]$Credential
    )

    Set-ALTestRunnerConfigValue -KeyName 'userName' -KeyValue $Credential.UserName
    Set-ALTestRunnerConfigValue -KeyName 'securePassword' -KeyValue (ConvertFrom-SecureString $Credential.Password)
}

Export-ModuleMember -Function Set-ALTestRunnerCredential