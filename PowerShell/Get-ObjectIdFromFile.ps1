function Get-ObjectIdFromFile {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    [Regex]::Match((Get-Content $Path).Item(0),' \d+ ').Value.Trim()
}

Export-ModuleMember -Function Get-ObjectIdFromFile