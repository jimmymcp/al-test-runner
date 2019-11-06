function Select-ALTestRunnerConfig {
    param (
        [Parameter(Mandatory=$false)]
        $LaunchJsonPath = (Get-LaunchJsonPath)
    )
    
    $LaunchJson = ConvertFrom-Json (Get-Content $LaunchJsonPath -Raw)
    $Configs = $LaunchJson.configurations | Where-Object request -eq 'launch'
    if ($null -eq $Configs.Count) {
        Set-ALTestRunnerConfigValue -KeyName 'launchConfigName' -KeyValue $Configs.name
        return $Configs.name
    }
    else {
        throw "Please enter the name of the launch configuration to use in the AL Test Runner config file."
    }
}