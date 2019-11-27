function Import-PowerShellModule {
    Param(
        [Parameter(Mandatory=$true)]
        [string]$Module
    )

    if ($null -eq (Get-Module -Name $Module)) {
        Import-Module $Module -DisableNameChecking
    }
}

Export-ModuleMember -Function Import-PowerShellModule