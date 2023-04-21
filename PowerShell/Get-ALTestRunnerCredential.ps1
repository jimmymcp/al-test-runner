function Get-ALTestRunnerCredential {
    param (
        [Parameter()]
        [switch]$VM,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    if ($VM.IsPresent) {
        $VMUserName = Get-ValueFromALTestRunnerConfig -KeyName 'vmUserName'
        $VMSecurePassword = Get-ValueFromALTestRunnerConfig -KeyName 'vmSecurePassword'

        if (($VMUserName -eq '') -or ($VMSecurePassword -eq '')) {
            $Credential = Get-Credential -Message ('Please enter the credentials to connect to vm {0}' -f (Get-ServerFromLaunchJson -LaunchConfig $LaunchConfig))
            if ($null -eq $Credential) {
                throw "Credentials not entered"
            }
            Set-ALTestRunnerCredential -Credential $Credential -VM
            return $Credential
        }
        else {
            return [pscredential]::new($VMUserName, (ConvertTo-SecureString $VMSecurePassword))
        }
    } else {
        $UserName = Get-ValueFromALTestRunnerConfig -KeyName 'userName'
        $SecurePwd = Get-ValueFromALTestRunnerConfig -KeyName 'securePassword'
        
        if (($UserName -eq '') -or ($SecurePwd -eq '')) {
            $Credential = Get-Credential -Message ('Please enter the credentials to connect to server {0}' -f (Get-ServerFromLaunchJson -LaunchConfig $LaunchConfig))
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

}

Export-ModuleMember -Function Get-ALTestRunnerCredential