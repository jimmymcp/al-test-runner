function Invoke-TestRunnerService {
    param (
        [Parameter(Mandatory=$false)]
        [string]$FileName = '',
        [Parameter(Mandatory=$false)]
        [int]$SelectionStart = 0
    )
    
    $Credential = Get-ALTestRunnerCredential
    $CodeunitId = Get-ObjectIdFromFile $FileName
    $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
    $Proxy = New-WebServiceProxy -Uri (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl') -Credential $Credential
    $Proxy.RunTest($CodeunitId, $TestName)
}

Export-ModuleMember -Function Invoke-TestRunnerService