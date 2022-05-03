function Get-FilterFromIDRanges {
    param(
        [Parameter(Mandatory = $false)]
        [string]$AppJsonPath = (Get-AppJsonPath)
    )

    $Filter = ''
    $IDRanges = Get-ValueFromAppJson -AppJsonPath $AppJsonPath -KeyName 'idRanges'
    if ($null -ne $IDRanges) {
        $IDRanges | ForEach-Object { $Filter += "$($_.from)..$($_.to)|" }
    }

    if ($Filter -eq '') {
        $IDRange = Get-ValueFromAppJson -AppJsonPath $AppJsonPath -KeyName 'idRange'
        if ($null -ne $IDRange) {
            $Filter = "$($IDRange.from)..$($IDRange.to)|"
        }
    }

    if ($Filter -ne '') {
        return $Filter.Substring(0, $Filter.Length - 1)
    }
    else {
        return ''
    }
}

Export-ModuleMember -Function Get-FilterFromIDRanges