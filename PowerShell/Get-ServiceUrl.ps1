function Get-ServiceUrl {
    param (
        [Parameter(Mandatory = $false)]
        [string]$Method,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    [string]$ServiceUrl = (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl')

    if ([String]::IsNullOrEmpty($ServiceUrl) -and $null -ne $LaunchConfig) {
        $ServiceUrl = Suggest-ServiceUrl -LaunchConfig $LaunchConfig -UseSOAP
        Set-ALTestRunnerConfigValue -KeyName 'testRunnerServiceUrl' -KeyValue $ServiceUrl

        #if the service url is blank then test runner service may not be installed either so check that now
        Install-TestRunnerService -LaunchConfig $LaunchConfig
    }

    if (Get-UrlIsForOData $ServiceUrl) {
        # if the service url is for OData then append the method to the url
        if ($ServiceUrl.Contains('_RunTest')) {
            $ServiceUrl = $ServiceUrl.Replace('_RunTest', '')
            Set-ALTestRunnerConfigValue -KeyName 'testRunnerServiceUrl' -KeyValue $ServiceUrl
        }

        return $ServiceUrl.Insert($ServiceUrl.IndexOf('?'), "_$Method")
    }
    else {
        # if the service url is for SOAP then just return the url
        return $ServiceUrl
    }
}

Export-ModuleMember -Function Get-ServiceUrl