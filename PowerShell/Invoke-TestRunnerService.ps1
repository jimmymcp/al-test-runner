function Invoke-TestRunnerService {
    param (
        [Parameter(Mandatory=$false)]
        [string]$FileName = '',
        [Parameter(Mandatory=$false)]
        [int]$SelectionStart = 0,
        [Parameter(Mandatory=$false)]
        [switch]$Init
    )
    
    $ServiceUrl = (Get-ValueFromALTestRunnerConfig -KeyName 'testRunnerServiceUrl')
    $Credential = Get-ALTestRunnerCredential
    $CodeunitId = Get-ObjectIdFromFile $FileName

    if ($Init.IsPresent) {
        $TestName = 'InitTestRunnerService'
        Write-Host "Initialising test runner"
    }
    else {
        $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
    }

    if (($null -eq $ServiceUrl) -or ('' -eq $ServiceUrl)) {
        throw 'Please set the OData url to the test runner service (testRunnerServiceUrl key in AL Test Runner config).'
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