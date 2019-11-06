function Get-ValueFromALTestRunnerConfig {
    Param(
        [Parameter(Mandatory=$false)]
        [string]$ConfigPath = (Get-ALTestRunnerConfigPath),
        [Parameter(Mandatory=$true)]
        [string]$KeyName
    )

    if (!(Test-Path $ConfigPath)) {
        New-ALTestRunnerConfigFile -Path $ConfigPath
    }

    $ConfigJson = ConvertFrom-Json (Get-Content $ConfigPath -Raw)

    if (($KeyName -eq 'launchConfigName') -and ($ConfigJson.$KeyName -eq '')) {
        return Select-ALTestRunnerConfig
    }

    $ConfigJson.$KeyName
}

Export-ModuleMember -Function Get-ValueFromALTestRunnerConfig