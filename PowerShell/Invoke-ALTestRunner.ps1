function Invoke-ALTestRunner {
    Param(
        [Parameter(Mandatory = $false)]
        [ValidateSet('All', 'Codeunit', 'Test')]
        [string]$Tests = 'All',
        [Parameter(Mandatory = $false)]
        [string]$FileName = '',
        [Parameter(Mandatory = $false)]
        [int]$SelectionStart = 0,
        [Parameter(Mandatory = $false)]
        [string]$ExtensionId,
        [Parameter(Mandatory = $false)]
        [string]$ExtensionName,
        [Parameter(Mandatory = $false)]
        [switch]$GetCodeCoverage,
        [Parameter(Mandatory = $false)]
        $DisabledTests,
        [Parameter(Mandatory = $false)]
        $LaunchConfig,
        [switch]$GetPerformanceProfile,
        [switch]$RunViaUrl,
        [Parameter(Mandatory = $true)]
        [string]$ResultsPath
    )

    Import-ContainerHelper

    $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
    if (!($RunViaUrl.IsPresent)) {
        Get-ServiceUrl -Method 'Get-PerformanceProfile' -LaunchConfig $LaunchConfig | Out-Null
        if (!(Get-ContainerIsRunning $ContainerName)) {
            throw "Container $ContainerName is not running. Please start the container and retry. Please note that container names are case-sensitive."
        }
    }

    $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'
    if ($CompanyName -eq '') {
        $CompanyName = Select-BCCompany $ContainerName -RunViaUrl:$RunViaUrl
    }
    
    $TestSuiteName = (Get-ValueFromALTestRunnerConfig -KeyName 'testSuiteName')
    
    if (!($RunViaUrl.IsPresent)) {
        if (($null -eq $TestSuiteName) -or ($TestSuiteName -eq '')) {
            [string]$NavVersionString = Invoke-CommandOnDockerHost { Param($ContainerName) Get-BCContainerNavVersion -containerOrImageName $ContainerName } -Parameters $ContainerName
            if ($NavVersionString.IndexOf('-') -gt 0) {
                $NavVersionString = $NavVersionString.Substring(0, $NavVersionString.IndexOf('-'))
            }
        
            [version]$NavVersion = [version]::new()
            if ([version]::TryParse($NavVersionString, [ref]$NavVersion)) {
                if ($NavVersion -lt [version]::new('15.0.0.0')) {
                    $TestSuiteName = Select-BCTestSuite
                    Set-ALTestRunnerConfigValue -KeyName 'testSuiteName' -KeyValue $TestSuiteName
                }
            }
        }
    }

    $Params = @{
        ContainerName         = $ContainerName
        CompanyName           = $CompanyName
        ExtensionId           = $ExtensionId
        TestSuiteName         = $TestSuiteName
        ExtensionName         = $ExtensionName
        GetCodeCoverage       = $GetCodeCoverage
        LaunchConfig          = $LaunchConfig
        GetPerformanceProfile = $GetPerformanceProfile
        ResultsPath           = $ResultsPath
    }

    Write-Verbose "Saving results to $ResultsPath"

    $Tenant = Get-TenantFromLaunchJson -LaunchConfig $LaunchConfig
    if ($Tenant) {
        $Params.Add('Tenant', $Tenant)
    }

    if ($FileName -ne '') {
        if (Get-FileIsTestCodeunit -FileName $FileName) {
            $Params.Add('TestCodeunit', (Get-ObjectIdFromFile $FileName))
        }
        else {
            throw "$FileName is not an AL test codeunit"
        }
    }

    if ($SelectionStart -ne 0) {
        $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
        if ($TestName -eq '') {
            throw "Please place the cursor within the test method that you want to run and try again."
        }
        else {
            $Params.Add('TestFunction', $TestName)
        }
    }

    if ((Get-ValueFromLaunchJson -KeyName 'authentication' -LaunchConfig $LaunchConfig) -eq 'UserPassword') {
        $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig
        $Params.Add('Credential', $Credential)
    }
    
    if ($null -ne $NavVersion -and $NavVersion -lt [version]::new('15.0.0.0')) {
        $Params.Add('TestRunnerCodeunitId', 0)
    }
    elseif ((Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerCodeunitId') -gt 0) {
        $Params.Add('TestRunnerCodeunitId', (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerCodeunitId'))
    }

    if ($null -ne $DisabledTests) {
        $Params.Add('DisabledTests', $DisabledTests)
    }

    if ($null -ne (Get-ValueFromALTestRunnerConfig -KeyName 'culture')) {
        $Params.Add('Culture', (Get-ValueFromALTestRunnerConfig -KeyName 'culture'))
    }

    if ($RunViaUrl.IsPresent) {
        Invoke-RunTestsViaUrl @Params
    }
    else {
        Invoke-RunTests @Params
    }
}

Export-ModuleMember -Function Invoke-ALTestRunner