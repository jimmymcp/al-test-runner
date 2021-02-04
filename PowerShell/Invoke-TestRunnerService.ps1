function Invoke-TestRunnerService {
    param (
        [Parameter(Mandatory=$false)]
        [string]$FileName = '',
        [Parameter(Mandatory=$false)]
        [int]$SelectionStart = 0,
        [Parameter(Mandatory=$false)]
        [switch]$Init
    )
    
    $ServiceUrl = Get-ServiceUrl -Method 'RunTest'
    $Credential = Get-ALTestRunnerCredential
    $CodeunitId = Get-ObjectIdFromFile $FileName

    if ($Init.IsPresent) {
        $TestName = 'InitTestRunnerService'
        Write-Host "Initialising test runner"
    }
    else {
        $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
    }

    try {
        Invoke-WebRequest $ServiceUrl `
            -Credential $Credential `
            -Method Post `
            -Body "{`"codeunitId`": $CodeunitId, `"testName`": `"$TestName`"}" `
            -ContentType application/json | Out-Null
        if (!($Init.IsPresent)) {
            Write-Host "Test $TestName passes" -ForegroundColor Green
        }
    }
    catch {
        try {
            $ErrorDetails = ConvertFrom-Json $_.ErrorDetails
            Write-Host $ErrorDetails.error.message -ForegroundColor DarkRed
        }
        catch {
            Write-Host $_ -ForegroundColor DarkRed
        }
    }
}

Export-ModuleMember -Function Invoke-TestRunnerService