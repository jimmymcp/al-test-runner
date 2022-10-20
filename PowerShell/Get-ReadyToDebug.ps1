function Get-ReadyToDebug {
    param(
        [string]$Path
    )

    Get-ServiceUrl # checks whether the service url is populated and the test runner app is installed
    Set-Content -Path $Path -Value '1'
}

Export-ModuleMember -Function Get-ReadyToDebug