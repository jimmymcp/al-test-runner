function New-ALTestRunnerConfigFile {
    param (
        [Parameter(Mandatory=$false)]
        [string]$Path
    )

    if (!(Test-Path (Split-Path $Path -Parent))) {
        New-Item (Split-Path $Path -Parent) -ItemType Directory | Out-Null
    }

    Set-Content -Path $Path -Value '{
        "launchConfigName": "",
        "containerResultPath": "",
        "userName": "",
        "securePassword": "",
        "vmUserName": "",
        "vmSecurePassword": "",
        "remoteContainerName": "",
        "remotePort": 0,
        "executionPreference": ""
    }'
}

Export-ModuleMember -Function New-ALTestRunnerConfigFile