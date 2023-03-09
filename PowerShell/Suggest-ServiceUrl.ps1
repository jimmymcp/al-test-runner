function Suggest-ServiceUrl {
    Param(
        [Parameter(Mandatory=$false)]
        $LaunchConfig
    )

    $ContainerName = Get-ContainerName
    $ServerInstance = Get-ValueFromLaunchJson -KeyName 'serverInstance' -LaunchConfig $LaunchConfig
    $ODataPort = 7048
    $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'

    if ([String]::IsNullOrEmpty($CompanyName)) {
        Select-BCCompany -ContainerName $ContainerName
    }

    return "http://$($ContainerName):$ODataPort/$ServerInstance/ODataV4/TestRunner?company=$CompanyName&tenant=default"
}

Export-ModuleMember -Function Suggest-ServiceUrl