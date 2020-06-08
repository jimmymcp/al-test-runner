function Get-FileIsTestCodeunit {
    param (
        [Parameter(Mandatory=$true)]
        [string]$FileName
    )
    if ($FileName.Substring($FileName.LastIndexOf('.')).ToLower() -ne '.al') {
        return $false
    }

    $FileContent = Get-Content $FileName -Raw
    $Matches = [regex]::Match($FileContent, 'Subtype = Test', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    return ($Matches.Captures.Count -gt 0)
}

Export-ModuleMember -Function Get-FileIsTestCodeunit