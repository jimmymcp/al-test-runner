function Suggest-ServiceUrl {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig,
        [Parameter(Mandatory = $false)]
        [switch]$UseSOAP
    )

    $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
    $ServerInstance = Get-ValueFromLaunchJson -KeyName 'serverInstance' -LaunchConfig $LaunchConfig
    $ODataPort = 7048
    $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'
    $SOAPPort = 7047

    if ([String]::IsNullOrEmpty($CompanyName)) {
        $CompanyName = Select-BCCompany -ContainerName $ContainerName
    }

    if ($UseSOAP.IsPresent) {
        return "http://$($ContainerName):$SOAPPort/$ServerInstance/WS/$CompanyName/Codeunit/TestRunner?tenant=default"
    }
    else {
        return "http://$($ContainerName):$ODataPort/$ServerInstance/ODataV4/TestRunner?company=$CompanyName&tenant=default"
    }
}

Export-ModuleMember -Function Suggest-ServiceUrl