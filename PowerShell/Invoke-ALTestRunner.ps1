function Invoke-ALTestRunner {
    Param(
        [Parameter(Mandatory=$false)]
        [ValidateSet('All','Codeunit','Test')]
        [string]$Tests = 'All',
        [Parameter(Mandatory=$false)]
        [string]$FileName = '',
        [Parameter(Mandatory=$false)]
        [int]$SelectionStart = 0,
        [Parameter(Mandatory=$false)]
        [string]$ExtensionId,
        [Parameter(Mandatory=$false)]
        [string]$ExtensionName
        )    

    Import-PowerShellModule 'navcontainerhelper'
    
    $ExecutionMethod = Get-ValueFromALTestRunnerConfig -KeyName 'executionPreference' 
    if ($ExecutionMethod -eq '') {
        $ExecutionMethod = Select-ExecutionMethod      
    }

    if ($ExecutionMethod -eq "Remote") {
        $remotePort = Get-ValueFromALTestRunnerConfig -KeyName 'remotePort'
        if ($remotePort -eq 0) {
            Write-Host "Please enter the port used for PowerShell Remoting:" -ForegroundColor DarkYellow
            $remotePort = Read-Host
        }

        $Credential = Get-ALTestRunnerCredential
        $Session = New-PSSession -ComputerName $(Get-ServerFromLaunchJson) -Credential $Credential -Port $remotePort -UseSSL -SessionOption (New-PSSessionOption -SkipCACheck -SkipCNCheck)
    } else {
        $ContainerName = Get-ServerFromLaunchJson
    }

    if (!(Get-ContainerIsRunning $ContainerName)) {
        throw "Container $ContainerName is not running. Please start the container and retry. Please note that container names are case-sensitive."
    }

    $CompanyName = Get-ValueFromALTestRunnerConfig -KeyName 'companyName'
    if ($CompanyName -eq '') {
        $CompanyName = Select-BCCompany -ContainerName $ContainerName        
    }
    
    $TestSuiteName = (Get-ValueFromALTestRunnerConfig -KeyName 'testSuiteName')
    
    if (($null -eq $TestSuiteName) -or ($TestSuiteName -eq '')) {
        [string]$NavVersionString = Get-BCContainerNavVersion -containerOrImageName $ContainerName
        if ($NavVersionString.IndexOf('-') -gt 0) {
            $NavVersionString = $NavVersionString.Substring(0,$NavVersionString.IndexOf('-'))
        }
        
        [version]$NavVersion = [version]::new()
        if ([version]::TryParse($NavVersionString, [ref]$NavVersion)) {
            if ($NavVersion -lt [version]::new('15.0.0.0')) {
                $TestSuiteName = Select-BCTestSuite
                Set-ALTestRunnerConfigValue -KeyName 'testSuiteName' -KeyValue $TestSuiteName
            }
        }
    }

    $Params = @{
        ContainerName = $ContainerName
        CompanyName = $CompanyName
        ExtensionId = $ExtensionId
        TestSuiteName = $TestSuiteName
        ExtensionName = $ExtensionName
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

    if ((Get-ValueFromLaunchJson -KeyName 'authentication') -eq 'UserPassword') {
        $Credential = Get-ALTestRunnerCredential
        $Params.Add('Credential', $Credential)
    }

    Invoke-RunTests @Params
}

Export-ModuleMember -Function Invoke-ALTestRunner