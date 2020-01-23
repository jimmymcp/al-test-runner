function Select-BCCompany {
    param (
        [Parameter(Mandatory=$false)]
        $ContainerName = (Get-ServerFromLaunchJson),
        [Parameter(Mandatory=$true)]
        [ValidateSet("Local","Remote")]
        [string]$ExecutionMethod,
        [Parameter(Mandatory=$false)]
        [System.Management.Automation.Runspaces.PSSession]$Session
    )
    
    if ($ExecutionMethod -eq "Local") {
        $Companies = Get-CompanyInBCContainer -containerName $ContainerName
    } else {
        $getCompanies={
            param(
                $ContainerName = $args[0]
            )
            
            return (Get-CompanyInBCContainer -containerName $ContainerName)
        }

        $CompaniesJob = Invoke-Command -Session $Session -ScriptBlock $getCompanies -ArgumentList $ContainerName -AsJob
        $Companies = Receive-Job -Job $CompaniesJob -Wait
    }


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