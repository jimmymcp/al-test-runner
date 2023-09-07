function Get-PerformanceProfile {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    $ServiceUrl = Get-ServiceUrl -Method 'GetPerformanceProfile' -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig

    $PerformanceProfilePath = './.altestrunner/PerformanceProfile.alcpuprofile'

    Write-Host "Downloading performance profile to $PerformanceProfilePath"
    $Params = @{
        Uri         = $ServiceUrl
        Credential  = $Credential
        Method      = 'Post'
        ContentType = 'application/json'
    }
    $Result = (Invoke-InvokeWebRequest $Params).Content | ConvertFrom-Json
    $PerformanceProfile = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Result.value))
    Set-Content -Path $PerformanceProfilePath -Value $PerformanceProfile
}

Export-ModuleMember -Function Get-PerformanceProfile