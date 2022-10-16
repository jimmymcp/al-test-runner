function Get-ServiceUrl {
    param (
        [Parameter(Mandatory = $false)]
        [string]$Method
    )

    [string]$ServiceUrl = (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl')

    if ([String]::IsNullOrEmpty($ServiceUrl)) {
        $ServiceUrl = Suggest-ServiceUrl
        Set-ALTestRunnerConfigValue -KeyName 'testRunnerServiceUrl' -KeyValue $ServiceUrl

        #if the service url is blank then test runner service may not be installed either no check that now
        if (!(Get-TestRunnerIsInstalled -ContainerName (Get-ContainerName))) {
            Install-TestRunnerService
        }
    }

    if ($ServiceUrl.Contains('_RunTest')) {
        $ServiceUrl = $ServiceUrl.Replace('_RunTest','')
        Set-ALTestRunnerConfigValue -KeyName 'testRunnerServiceUrl' -KeyValue $ServiceUrl
    }

    return $ServiceUrl.Insert($ServiceUrl.IndexOf('?'), "_$Method")
}

Export-ModuleMember -Function Get-ServiceUrl