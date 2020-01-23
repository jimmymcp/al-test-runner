function Invoke-RunTests {
    Param(
        [Parameter(Mandatory=$true)]
        $ContainerName,
        [Parameter(Mandatory=$true)]
        $CompanyName,
        [Parameter(Mandatory=$false)]
        [pscredential]$Credential,
        [Parameter(Mandatory=$true)]
        [Guid]$ExtensionId,
        [Parameter(Mandatory=$false)]
        [ValidateSet('All,Codeunit,Test')]
        [string]$Tests = 'All',
        [Parameter(Mandatory=$false)]
        [string]$TestCodeunit = '',
        [Parameter(Mandatory=$false)]
        [string]$TestFunction = '',
        [Parameter(Mandatory=$false)]
        [string]$TestSuiteName = '',
        [Parameter(Mandatory=$false)]
        [string]$ExtensionName,
        [Parameter(Mandatory=$true)]
        [ValidateSet("Local","Remote")]
        [string]$ExecutionMethod,
        [Parameter(Mandatory=$false)]
        [System.Management.Automation.Runspaces.PSSession]$Session
    )

    $ContainerFunctionsParams = @{'ContainerName'= $ContainerName; 'ExecutionMethod'= $ExecutionMethod}
    if($ExecutionMethod -eq "Remote") {
        $ContainerFunctionsParams.Add('Session', $Session);
    }

    $ResultId = [Guid]::NewGuid().Guid + ".xml"
    $ResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) $ResultId
    $LastResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'last.xml'
    $ContainerResultFile = Join-Path (Get-ContainerResultPath @ContainerFunctionsParams) $ResultId
    
    $Message = "Running tests on $ContainerName, company $CompanyName"

    $Params = @{
        containerName = $ContainerName
        companyName = $CompanyName 
        XUnitResultFileName = $ContainerResultFile
    }
    
    if ($null -ne $Credential) {
        $Params.Add('credential', $Credential)
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

    [int]$AttemptNo = 1
    [bool]$BreakTestLoop = $false
    
    while(!$BreakTestLoop) {
        try {
            Write-Host $Message -ForegroundColor Green

            if ($ExecutionMethod -eq "Remote") {
                $testBlock={
                    param
                    (
                        $Params = $args[0],
                        $ContainerResultFile = $args[1],
                        $ResultId = $args[2]
                    )

                    Run-TestsInBCContainer @Params -detailed -Verbose
                    if (Test-Path $ContainerResultFile) {
                        if (-not (Test-Path 'C:\BCContainerTests\')){
                            New-Item -Path 'C:\' -Name BCContainerTests -ItemType Directory -Force | Out-Null
                        }
    
                        $lastResultRemotePath = Join-Path -Path 'C:\BCContainerTests' -ChildPath 'last.xml'
                        $resultRemotePath = Join-Path -Path 'C:\BCContainerTests' -ChildPath "$($ResultId).xml"
    
                        Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $lastResultRemotePath
                        Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $resultRemotePath
                    }    
                }

                $testJob = Invoke-Command -Session $Session -ScriptBlock $testBlock -ArgumentList $Params,$ContainerResultFile, $ResultId -AsJob
                $testsRun = Receive-Job -Job $testJob -Wait

                Copy-Item -FromSession $Session -Path "C:\BCContainerTests\last.xml" -Destination $LastResultFile
                Copy-Item -FromSession $Session -Path "C:\BCContainerTests\$($ResultId).xml" -Destination $ResultFile
            } else {
                Run-TestsInBCContainer @Params -detailed -Verbose

                if (Test-Path $ContainerResultFile) {
                    Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $LastResultFile
                    Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $ResultFile
                    
                }
                else {
                    throw 'Tests have not been run'
                }
            }        
            Merge-ALTestRunnerTestResults -ResultsFile $ResultFile -ToPath (Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'Results')
            Remove-Item $ResultFile
            Remove-Item $ContainerResultFile
            $BreakTestLoop = $true    
        }
        catch {
            $AttemptNo++            
            Write-Host "Error occurred, retrying..." -ForegroundColor Magenta

            if ($AttemptNo -ge 3) {
                $BreakTestLoop = $true
            }
        }
    }
}

Export-ModuleMember -Function Invoke-RunTests