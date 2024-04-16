function Test-CompanyExists {
    Param(
        [Parameter(Mandatory=$false)]
        [string]$CompanyName,
        [Parameter(Mandatory=$false)]
        $LaunchConfig
    )

    if ([String]::IsNullOrEmpty($CompanyName)) {
        $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'
    }

    $Company = Invoke-CommandOnDockerHost {Param($ContainerName, $CompanyName) Get-CompanyInBcContainer -containerName $ContainerName | Where-Object CompanyName -eq $CompanyName} -Parameters (Get-ContainerName -LaunchConfig $LaunchConfig), $CompanyName
    
    if ($null -eq $Company) {
        return Select-BCCompany
    }
}

Export-ModuleMember -Function Test-CompanyExists