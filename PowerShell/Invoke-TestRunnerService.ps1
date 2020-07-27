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
    try {
        Invoke-WebRequest (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl') `
            -Credential $Credential `
            -Method Post `
            -Body "{`"codeunitId`": $CodeunitId, `"testName`": `"$TestName`"}" `
            -ContentType application/json | Out-Null
        Write-Host "Test $TestName passes" -ForegroundColor Green
    }
    catch {
        $ErrorDetails = ConvertFrom-Json $_.ErrorDetails
        Write-Host $ErrorDetails.error.message -ForegroundColor DarkRed
    }
}

Export-ModuleMember -Function Invoke-TestRunnerService