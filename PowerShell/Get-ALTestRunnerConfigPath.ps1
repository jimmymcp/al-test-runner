function Get-ALTestRunnerConfigPath {
    Get-ChildItem (Join-Path (Get-Location) ..) -Recurse -Filter '.altestrunner' | ForEach-Object {
        $ConfigPath = (Join-Path $_.FullName 'config.json')
        if (Test-Path $ConfigPath) {
            $JsonConfig = ConvertFrom-Json (Get-Content $ConfigPath -Raw)
            if ($JsonConfig.launchConfigName.length -gt 0) {
                return $ConfigPath
            }
        }
    }
}

Export-ModuleMember -Function Get-ALTestRunnerConfigPath