function Get-TestClientPath {
    return Join-Path (Split-Path (Get-Module 'ALTestRunner').Path -Parent) 'TestClient'
}

Export-ModuleMember -Function Get-TestClientPath