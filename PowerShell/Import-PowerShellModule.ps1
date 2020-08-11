function Import-PowerShellModule {
    Param(
        [Parameter(Mandatory=$true)]
        [string]$Module
    )

    Invoke-CommandOnDockerHost {
        Param($Module)
        if ($null -eq (Get-Module -Name $Module)) {
            Write-Host "Importing module $Module"
            Import-Module $Module -DisableNameChecking
        }
    } -Parameters $Module
}

Export-ModuleMember -Function Import-PowerShellModule