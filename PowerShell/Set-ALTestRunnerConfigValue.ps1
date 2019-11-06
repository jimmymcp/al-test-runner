function Set-ALTestRunnerConfigValue {
    Param(
        [Parameter(Mandatory=$false)]
        [string]$ConfigPath = (Get-ALTestRunnerConfigPath),
        [Parameter(Mandatory=$true)]
        [string]$KeyName,
        [Parameter(Mandatory=$true)]
        [string]$KeyValue
    )

    $ConfigJson = ConvertFrom-Json (Get-Content $ConfigPath -Raw)
    if ($null -eq ($ConfigJson | Get-Member -Name $KeyName)) {
        $ConfigJson | Add-Member -Name $KeyName -Value '' -MemberType NoteProperty
    }

    $ConfigJson.$KeyName = $KeyValue
    Set-Content -Path $ConfigPath -Value (ConvertTo-Json $ConfigJson)
}

Export-ModuleMember -Function Set-ALTestRunnerConfigValue