function Test-PowerShellModule {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [string]
        $Name
    )

    if ($null -ne (Get-Module | Where-Object Name -EQ $Name)) {
        return $true
    }

    return $null -ne ((Get-Module -ListAvailable) | Where-Object Name -eq $Name)
}

Export-ModuleMember -Function Test-PowerShellModule