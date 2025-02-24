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
        $BCCompilerFolder
    )

    $ResultId = [Guid]::NewGuid().Guid + ".xml"
    $ResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) $ResultId
    $LastResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'last.xml'
    
    $Message = "Running tests on $ContainerName, company $CompanyName"

    $Params = @{
        containerName       = $ContainerName
        companyName         = $CompanyName 
        XUnitResultFileName = $ContainerResultFile
        culture             = $Culture
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

    $bcContainerHelperPath = Join-Path (Split-Path (Get-Module bccontainerhelper).Path -Parent) 'AppHandling'
    $PsTestToolFolder = Join-Path ([System.IO.Path]::GetTempPath()) "$([Guid]::NewGuid().ToString())"
    New-Item $PsTestToolFolder -ItemType Directory | Out-Null
    $testDlls = Join-Path $BCCompilerFolder "dlls/Test Assemblies/*.dll"
    Copy-Item $testDlls -Destination $PsTestToolFolder -Force
    Copy-Item -Path (Join-Path $bcContainerHelperPath "PsTestFunctions.ps1") -Destination $PsTestToolFolder -Force
    Copy-Item -Path (Join-Path $bcContainerHelperPath "ClientContext.ps1") -Destination $PsTestToolFolder -Force

    $PsTestFunctionsPath = Join-Path $PsTestToolFolder "PsTestFunctions.ps1"
    $ClientContextPath = Join-Path $PsTestToolFolder "ClientContext.ps1"
    $newtonSoftDllPath = Join-Path $PsTestToolFolder "Newtonsoft.Json.dll"
    $clientDllPath = Join-Path $PsTestToolFolder "Microsoft.Dynamics.Framework.UI.Client.dll"

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
    $serviceUrl = "$(($LaunchConfig.server).TrimEnd('/'))/$serverInstance/cs?tenant=$Tenant&company=$CompanyName"

    Write-Host "Connecting to $serviceUrl"
    $clientContext = $null

    $clientContext = New-ClientContext -serviceUrl $serviceUrl -auth $clientServicesCredentialType -credential $credential -interactionTimeout ([timespan]::FromHours(24)) -culture '' -timezone ''

    $result = Run-Tests @Param -clientContext $clientContext `
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
        -ProduceCodeCoverageMap 'Disabled'

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

Export-ModuleMember -Function Invoke-RunTestsViaUrl
