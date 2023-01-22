function Invoke-RunTests {
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
        [string]$TestCodeunit = '',
        [Parameter(Mandatory = $false)]
        [string]$TestFunction = '',
        [Parameter(Mandatory = $false)]
        [string]$TestSuiteName = '',
        [Parameter(Mandatory = $false)]
        [string]$ExtensionName,
        [Parameter(Mandatory = $false)]
        [switch]$GetCodeCoverage,
        [Parameter(Mandatory=$false)]
        [int]$TestRunnerCodeunitId = 130450,
        [Parameter(Mandatory = $false)]
        $DisabledTests,
        [Parameter(Mandatory = $false)]
        $Culture = 'en-US'
    )

    $ResultId = [Guid]::NewGuid().Guid + ".xml"
    $ResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) $ResultId
    $LastResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'last.xml'
    $ContainerResultFile = Join-Path (Get-ContainerResultPath) $ResultId
    
    $Message = "Running tests on $ContainerName, company $CompanyName"

    $Params = @{
        containerName       = $ContainerName
        companyName         = $CompanyName 
        XUnitResultFileName = $ContainerResultFile
        culture             = $Culture
    }
    
    if ($null -ne $Credential) {
        $Params.Add('credential', $Credential)
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

    [int]$AttemptNo = 1
    [bool]$BreakTestLoop = $false
    
    while (!$BreakTestLoop) {
        try {
            Write-Host $Message -ForegroundColor Green
            $refreshToken = Get-ValueFromALTestRunnerConfig -KeyName 'refreshToken'
            if ($null -ne $refreshToken) {
                $authContext = New-BcAuthContext -refreshToken $refreshToken
                $Params.Add('bcAuthContext', $authContext)
            }
            Invoke-CommandOnDockerHost { Param($Params) Run-TestsInBCContainer @Params -detailed -Verbose } -Parameters $Params
            
            if (Get-DockerHostIsRemote) {
                $Session = Get-DockerHostSession
                Invoke-CommandOnDockerHost {
                    Param($ContainerResultFile, $ResultId)
                    if (Test-Path $ContainerResultFile) {
                        if (-not (Test-Path 'C:\BCContainerTests\')) {
                            New-Item -Path 'C:\' -Name BCContainerTests -ItemType Directory -Force | Out-Null
                        }

                        Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath (Join-Path 'C:\BCContainerTests' $ResultId)

                    }
                    else {
                        throw 'Tests have not been run'
                    }
                } -Parameters ($ContainerResultFile, $ResultId)

                if ($GetCodeCoverage.IsPreset) {
                    Get-CodeCoverage
                }

                Write-Host "Copy C:\BCContainerTests\$ResultId to $LastResultFile"
                Copy-Item -FromSession $Session -Path "C:\BCContainerTests\$ResultId" -Destination $ResultFile
                Copy-Item -Path $ResultFile -Destination $LastResultFile
            }
            else {
                if (Test-Path $ContainerResultFile) {
                    if ($GetCodeCoverage.IsPresent) {
                        Get-CodeCoverage
                    }
                    
                    Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $ResultFile
                    Copy-Item -Path $ResultFile -Destination $LastResultFile
                }
                else {
                    throw 'Tests have not been run'
                }
            }

            Merge-ALTestRunnerTestResults -ResultsFile $ResultFile -ToPath (Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'Results')
            Remove-Item $ResultFile

            if (!(Get-DockerHostIsRemote)) {
                Remove-Item $ContainerResultFile
            }
            $BreakTestLoop = $true
        }
        catch {
            $AttemptNo++
            Write-Host "Error occurred ($_)" -ForegroundColor Magenta
            Write-Host "Testing company set in config file exists in the container" -ForegroundColor Cyan
            $NewCompanyName = Test-CompanyExists

            if (![string]::IsNullOrEmpty($NewCompanyName)) {
                $Params.Remove('companyName')
                $Params.Add('companyName', $NewCompanyName)
            }

            if ($AttemptNo -ge 3) {
                $BreakTestLoop = $true
            }
        }
    }
}

Export-ModuleMember -Function Invoke-RunTests
