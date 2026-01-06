function Suggest-ServiceUrl {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig,
        [Parameter(Mandatory = $false)]
        [switch]$UseSOAP
    )

    $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
    $ServerInstance = Get-ValueFromLaunchJson -KeyName 'serverInstance' -LaunchConfig $LaunchConfig
    $LaunchPort = Get-ValueFromLaunchJson -KeyName 'port' -LaunchConfig $LaunchConfig -DefaultValue 0
    $Protocol = "http://"
    $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'

    # if the launch port is specified as 443 then we can assume that the container is being a traefik proxy and append soap or rest as approriate
    if ($LaunchPort -eq 443) {
        $Protocol = "https://"
        $ServerInstance = $ServerInstance.TrimEnd('dev')
        if ($UseSOAP.IsPresent) {
            $ServerInstance += 'soap'
        }
        else {
            $ServerInstance += 'rest'
        }
    }
    else {
        $ODataPort = ":7048"
        $SOAPPort = ":7047"
    }

    if ([String]::IsNullOrEmpty($CompanyName)) {
        $CompanyName = Select-BCCompany -ContainerName $ContainerName
    }

    if ($UseSOAP.IsPresent) {
        return "$Protocol$ContainerName$SOAPPort/$ServerInstance/WS/$CompanyName/Codeunit/TestRunner?tenant=default"
    }
    else {
        return "$Protocol$ContainerName$ODataPort/$ServerInstance/ODataV4/TestRunner?company=$CompanyName&tenant=default"
    }
}

Export-ModuleMember -Function Suggest-ServiceUrl