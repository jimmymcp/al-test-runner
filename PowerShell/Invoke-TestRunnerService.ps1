function Invoke-TestRunnerService {
    param (
        [Parameter(Mandatory = $false)]
        [string]$FileName = '',
        [Parameter(Mandatory = $false)]
        [int]$SelectionStart = 0
    )
    
    $Credential = Get-ALTestRunnerCredential

    if ($FileName -ne '') {
        $ServiceUrl = Get-ServiceUrl -Method 'RunTest'
        $CodeunitId = Get-ObjectIdFromFile $FileName
        $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
        $Body = "{`"codeunitId`": $CodeunitId, `"testName`": `"$TestName`"}"
    }
    else {
        $ServiceUrl = Get-ServiceUrl -Method 'RunTestsFromFilter'
        $CodeunitIDFilter = Get-FilterFromIDRanges
        $TestName = ''
        $Body = "{`"codeunitIdFilter`": `"$CodeunitIDFilter`", `"testName`": `"$TestName`"}"
    }

    try {
        Invoke-WebRequest $ServiceUrl `
            -Credential $Credential `
            -Method Post `
            -Body $Body `
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