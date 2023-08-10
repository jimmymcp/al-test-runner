function Get-ObjectIdFromFile {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    $Content = Get-Content $Path -Raw
    $RegExMatches = [Regex]::Match($Content,'(codeunit|controladdin|dotnet|entitlement|enum|interface|page|pagecustomization|permissionset|profile|query|report|requestpage|table)(extension){0,1} \d+')
    $RegExMatches[0].Value.Split(' ')[1]
}

Export-ModuleMember -Function Get-ObjectIdFromFile