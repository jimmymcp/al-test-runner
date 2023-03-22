function Get-ReadyToDebug {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    Get-ServiceUrl -LaunchConfig $LaunchConfig # checks whether the service url is populated and the test runner app is installed
    Set-Content -Path $Path -Value '1'
}

Export-ModuleMember -Function Get-ReadyToDebug