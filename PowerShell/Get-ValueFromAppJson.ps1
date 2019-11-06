function Get-ValueFromAppJson {
    param (
        [Parameter(Mandatory=$false)]
        $AppJsonPath = (Get-AppJsonPath),
        [Parameter(Mandatory=$true)]
        [string]$KeyName
    )
 
    $AppJson = ConvertFrom-Json (Get-Content $AppJsonPath -Raw)
    $AppJson.$KeyName
}

Export-ModuleMember -Function Get-ValueFromAppJson