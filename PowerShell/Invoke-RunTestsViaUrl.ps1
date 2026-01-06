function Invoke-RunTestsViaUrl {
    Param(
        [Parameter(Mandatory = $true)]
        $ContainerName,
        [Parameter(Mandatory = $false)]
        $Tenant,
        [Parameter(Mandatory = $true)]
        $CompanyName,
        [Parameter(Mandatory = $false)]
        [pscredential]$Credential,
        [Parameter(Mandatory = $true)]
        [Guid]$ExtensionId,
        [Parameter(Mandatory = $false)]
        [ValidateSet('All,Codeunit,Test')]
        [string]$Tests = 'All',
        [Parameter(Mandatory = $false)]
        [string]$TestCodeunit = '*',
        [Parameter(Mandatory = $false)]
        [string]$TestFunction = '*',
        [Parameter(Mandatory = $false)]
        [string]$TestSuiteName = 'DEFAULT',
        [Parameter(Mandatory = $false)]
        [string]$ExtensionName,
        [Parameter(Mandatory = $false)]
        [switch]$GetCodeCoverage,
        [Parameter(Mandatory = $false)]
        [int]$TestRunnerCodeunitId = 130450,
        [Parameter(Mandatory = $false)]
        $DisabledTests,
        [Parameter(Mandatory = $false)]
        $Culture = 'en-US',
        [Parameter(Mandatory = $false)]
        $LaunchConfig,
        [switch]$GetPerformanceProfile,
        [Parameter(Mandatory = $true)]
        [string]$ResultsPath
    )

    $ResultId = [Guid]::NewGuid().Guid + ".xml"
    $ResultFile = Join-Path $ResultsPath $ResultId
    $LastResultFile = Join-Path $ResultsPath 'last.xml'

    try {
        $Message = "Running tests on $ContainerName, company $CompanyName"

        $Params = @{
            containerName = $ContainerName
            companyName   = $CompanyName
            culture       = $Culture
        }

        if ($Tenant) {
            $Params.Add('tenant', $Tenant)
            $Message += ", tenant $Tenant"
        }

        if ($TestCodeunit -ne '') {
            $Params.Add('testCodeunit', $TestCodeunit)
            $Message += ", codeunit $TestCodeunit"
        }

        if ($TestFunction -ne '') {
            $Params.Add('testFunction', $TestFunction)
            $Message += ", function $TestFunction"
        }

        if ($TestSuiteName -ne '') {
            $Params.Add('testSuite', $TestSuiteName)
            $Message += ", suite $TestSuiteName"
        }
        else {
            $TestSuiteName = 'DEFAULT'
            $Params.Add('extensionId', $ExtensionId)
            $Message += ", extension {0}" -f $ExtensionName
        }

        if ($TestRunnerCodeunitId -ne 0) {
            $Params.Add('testRunnerCodeunitId', $TestRunnerCodeunitId)
            $Message += ", test runner $TestRunnerCodeunitId"
        }

        if ($null -ne $DisabledTests) {
            $Params.Add('disabledTests', $DisabledTests)
        }

        $Message += ", culture $Culture"

        Write-Host $Message -ForegroundColor Green

        $PsTestFunctionsPath = Join-Path (Get-TestClientPath) "PsTestFunctions.ps1"
        $ClientContextPath = Join-Path (Get-TestClientPath) "ClientContext.ps1"
        $newtonSoftDllPath = Get-NewtonsoftJsonPath
        $clientDllPath = Join-Path (Get-TestClientPath) "Microsoft.Dynamics.Framework.UI.Client.dll"

        . $PsTestFunctionsPath -newtonSoftDllPath $newtonSoftDllPath -clientDllPath $clientDllPath -clientContextScriptPath $ClientContextPath

        $LaunchConfig = $LaunchConfig | ConvertFrom-Json

        if ($LaunchConfig.authentication -eq 'UserPassword') {
            $clientServicesCredentialType = "NavUserPassword"
        }
        else {
            $clientServicesCredentialType = $LaunchConfig.authentication
        }

        # if port 443 is specified then we can assume that the container is behind a traefik proxy and can trim 'dev' from the end of the server instance name
        if ($LaunchConfig.port -eq 443) {
            $serverInstance = $LaunchConfig.serverInstance.TrimEnd('dev')
        }
        else {
            $serverInstance = $LaunchConfig.serverInstance
        }

        $serviceUrl = "$(($LaunchConfig.server).TrimEnd('/'))/$serverInstance/cs?tenant=$Tenant&company=$CompanyName"

        Write-Host "Connecting to $serviceUrl"
        $clientContext = $null

        $clientContext = New-ClientContext -serviceUrl $serviceUrl -auth $clientServicesCredentialType -credential $credential -interactionTimeout ([timespan]::FromHours(24)) -culture '' -timezone ''

        Run-Tests @Param -clientContext $clientContext `
            -TestSuite $TestSuiteName `
            -TestCodeunit $TestCodeunit `
            -TestFunction $TestFunction `
            -TestGroup '*' `
            -ExtensionId $ExtensionId `
            -TestRunnerCodeunitId $TestRunnerCodeunitId `
            -DisabledTests $DisabledTests `
            -XUnitResultFileName $ResultFile `
            -AppendToXUnitResultFile:$false `
            -AzureDevOps 'no' `
            -GitHubActions 'no' `
            -detailed:$true `
            -debugMode:$false `
            -testPage 130455 `
            -connectFromHost:$true `
            -CodeCoverageTrackingType 'Disabled' `
            -ProduceCodeCoverageMap 'Disabled' | Out-Null

        if ($GetCodeCoverage.IsPresent) {
            Get-CodeCoverage -LaunchConfig $LaunchConfig
        }

        if ($GetPerformanceProfile.IsPresent) {
            Get-PerformanceProfile -LaunchConfig $LaunchConfig
        }

        if (Test-Path $ResultFile) {
            Merge-ALTestRunnerTestResults -ResultsFile $ResultFile -ToPath (Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'Results')
            Copy-Item $ResultFile -Destination $LastResultFile -Force
            Remove-Item $ResultFile -Force
        }
    }
    catch {
        # Ensure we always create a results file, even on error
        # This prevents the extension from hanging indefinitely
        Write-Host "Error during test execution: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red

        # Escape XML special characters (ampersand must be first to avoid double-escaping)
        $ErrorMessage = $_.Exception.Message -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;'
        $ErrorStackTrace = $_.ScriptStackTrace -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;'

        $errorXml = @"
<?xml version="1.0" encoding="utf-8"?>
<assemblies>
  <assembly name="AL Test Runner Error" total="0" passed="0" failed="1" skipped="0" time="0" errors="1" run-date="$(Get-Date -Format 'yyyy-MM-dd')" run-time="$(Get-Date -Format 'HH:mm:ss')">
    <collection>
      <test name="PowerShell Execution Error" type="Error" method="ExecutionError" time="0" result="Fail">
        <failure exception-type="PowerShellExecutionError">
          <message><![CDATA[$ErrorMessage]]></message>
          <stack-trace><![CDATA[$ErrorStackTrace]]></stack-trace>
        </failure>
      </test>
    </collection>
  </assembly>
</assemblies>
"@

        # Ensure the results directory exists
        if (!(Test-Path $ResultsPath)) {
            New-Item -Path $ResultsPath -ItemType Directory -Force | Out-Null
        }

        # Write error result to both result file and last.xml
        $errorXml | Out-File -FilePath $LastResultFile -Encoding UTF8 -Force

        # Do not re-throw - error is already recorded in XML for processing
    }
}

Export-ModuleMember -Function Invoke-RunTestsViaUrl
