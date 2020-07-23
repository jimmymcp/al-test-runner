function Get-ValueFromLaunchJson {
    param (
        [Parameter(Mandatory=$false)]
        [string]$LaunchJsonPath = (Get-LaunchJsonPath),
        [Parameter(Mandatory=$false)]
        $ConfigName = (Get-ValueFromALTestRunnerConfig -KeyName 'launchConfigName'),
        [Parameter(Mandatory=$true)]
        $KeyName
    )
    
    $LaunchJson = Get-LaunchJson -Path $LaunchJsonPath
    ($LaunchJson.configurations | Where-Object name -eq $ConfigName).$KeyName
}

function Get-LaunchJson {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    $LaunchJson = Get-Content $Path
    $LaunchJson = $LaunchJson | Where-Object {$_.ToString().Trim().StartsWith('//') -eq $false}
    $LaunchJson = $LaunchJson -join [Environment]::NewLine

    while (($LaunchJson.IndexOf('/*') -gt 0) -and ($LaunchJson.IndexOf('*/') -gt 0)) {
        $Start = $LaunchJson.IndexOf('/*')
        $End = $LaunchJson.IndexOf('*/')
        $LaunchJson = $LaunchJson.Remove($Start, $End - $Start + 2)
    }

    ConvertFrom-Json $LaunchJson
}

Export-ModuleMember -Function Get-ValueFromLaunchJson
Export-ModuleMember -Function Get-LaunchJson