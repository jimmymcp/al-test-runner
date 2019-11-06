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
        [string]$TestFunction = ''
    )

    Import-Module 'navcontainerhelper' -DisableNameChecking
    
    $ResultId = [Guid]::NewGuid().Guid + ".xml"
    $ResultFile = Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) $ResultId
    $ContainerResultFile = Join-Path (Get-ContainerResultPath) $ResultId
    
    $Message = "Running tests on $ContainerName, company $CompanyName, extension {0}" -f (Get-ValueFromAppJson -KeyName name)

    $Params = @{
        containerName = $ContainerName
        companyName = $CompanyName
        extensionId = $ExtensionId
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
    

    Write-Host $Message -ForegroundColor Green
    Run-TestsInBCContainer @Params -detailed -Verbose

    Copy-FileFromBCContainer -containerName $ContainerName -containerPath $ContainerResultFile -localPath $ResultFile
    Merge-ALTestRunnerTestResults $ResultFile (Join-Path (Split-Path (Get-ALTestRunnerConfigPath) -Parent) 'directory.xml')
    Remove-Item $ResultFile
    Remove-Item $ContainerResultFile
}

Export-ModuleMember -Function Invoke-RunTests