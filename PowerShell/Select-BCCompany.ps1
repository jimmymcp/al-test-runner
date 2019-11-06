function Select-BCCompany {
    param (
        [Parameter(Mandatory=$false)]
        $ContainerName = (Get-ServerFromLaunchJson)
    )
    
    $Companies = Get-CompanyInBCContainer -containerName $ContainerName
    if ($null -eq $Companies.Count) {
        $CompanyName = $Companies.CompanyName
    }
    else {
        $CompanyName = ($Companies | Out-GridView -Title 'Please select a company' -OutputMode Single).CompanyName
    }

    Set-ALTestRunnerConfigValue -KeyName 'companyName' -KeyValue $CompanyName
    return $CompanyName
}

Export-ModuleMember -Function Select-BCCompany