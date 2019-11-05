function Get-ALTestRunnerConfigPath {
    Join-Path (Join-Path (Get-Location) '.altestrunner') 'config.json'
}

Export-ModuleMember -Function Get-ConfigPath