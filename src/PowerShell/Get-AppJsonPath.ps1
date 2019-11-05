function Get-AppJsonPath {
    Join-Path (Get-Location) 'app.json'
}

Export-ModuleMember -Function Get-AppJsonPath