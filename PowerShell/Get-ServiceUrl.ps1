function Get-ServiceUrl {
    param (
        [Parameter(Mandatory = $false)]
        [string]$Method
    )

    [string]$ServiceUrl = (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl')

    if ([String]::IsNullOrEmpty($ServiceUrl)) {
        throw 'Please set the OData url to the test runner service (testRunnerServiceUrl key in AL Test Runner config).'
    }

    if ($ServiceUrl.Contains('_RunTest')) {
        $ServiceUrl = $ServiceUrl.Replace('_RunTest','')
        Set-ALTestRunnerConfigValue -KeyName 'testRunnerServiceUrl' -KeyValue $ServiceUrl
    }

    return $ServiceUrl.Insert($ServiceUrl.IndexOf('?'), "_$Method")
}

Export-ModuleMember -Function Get-ServiceUrl