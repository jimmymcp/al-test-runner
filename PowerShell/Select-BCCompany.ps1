function Select-BCCompany {
    param (
        [Parameter(Mandatory=$false)]
        $ContainerName = (Get-ServerFromLaunchJson)
    )
    
    $Companies = Get-CompanyInBCContainer -containerName $ContainerName
    if (($null -eq $Companies.Count) -or ($Companies.Count -eq 1)) {
        $CompanyName = $Companies.CompanyName
    }
    else {
        $Options = @()
        foreach ($Company in $Companies) {
            $Options += $Company.CompanyName
        }
        $CompanyName = Get-SelectionFromUser -Options $Options -Prompt "Please select a company to run tests in:"
        if ($CompanyName -eq '') {
            throw
        }
    }

    Set-ALTestRunnerConfigValue -KeyName 'companyName' -KeyValue $CompanyName
    return $CompanyName
}

Export-ModuleMember -Function Select-BCCompany