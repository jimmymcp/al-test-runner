function Get-LaunchJsonPath {
    Join-Path (Join-Path (Get-Location) '.vscode') 'launch.json'
}

Export-ModuleMember -Function Get-LaunchJsonPath