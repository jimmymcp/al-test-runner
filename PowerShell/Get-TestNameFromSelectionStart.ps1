function Get-TestNameFromSelectionStart {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path,
        [Parameter(Mandatory=$true)]
        [int]$SelectionStart
    )
    
    $Lines = Get-Content $Path
    for ($i = ($SelectionStart - 1); $i -ge 0; $i--) {
        if ($Lines.Item($i).ToUpper().Contains('[TEST]')) {
            # search forwards for the procedure declaration (it might not be the following line)
            for ($j = $i; $j -le $Lines.Count; $j++)
            {
                if ($Lines.Item($j).Contains('procedure')) {
                    $ProcDeclaration = $Lines.Item($j)
                    $ProcDeclaration = $ProcDeclaration.Substring($ProcDeclaration.IndexOf('procedure') + 10)
                    $ProcDeclaration = $ProcDeclaration.Substring(0,$ProcDeclaration.IndexOf('('))
                    return $ProcDeclaration
                }
            }
        }
    }
    return ''
}

Export-ModuleMember -Function Get-TestNameFromSelectionStart