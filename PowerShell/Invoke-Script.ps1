function Invoke-Script {
    Param(
        [Parameter(Mandatory=$true)]
        $Script
    )

    Write-Host "Invoking script:"
    Write-Host $Script

    $TempPath = (Join-Path $env:TEMP ([guid]::NewGuid().Guid)) + '.ps1'
    Set-Content -Path $TempPath -Value $Script
    &$TempPath
    Remove-Item $TempPath
}

Export-ModuleMember -Function Invoke-Script