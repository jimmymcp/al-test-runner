function Invoke-TestRunnerService {
    param (
        [Parameter(Mandatory = $false)]
        [string]$FileName = '',
        [Parameter(Mandatory = $false)]
        [int]$SelectionStart = 0,
        [Parameter(Mandatory = $false)]
        [switch]$Init
    )
    
    $Credential = Get-ALTestRunnerCredential

    if ($Init.IsPresent) {
        $ServiceUrl = Get-ServiceUrl -Method 'RunTestsFromFilter'
        $CodeunitIDFilter = Get-FilterFromIDRanges
        $TestName = 'InitTestRunnerService'
        $Body = "{`"codeunitIdFilter`": $CodeunitIDFilter, `"testName`": `"$TestName`"}"
        Write-Host "Initialising test runner"
    }
    elseif ($FileName -ne '') {
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

    $Params = @{
        Uri         = $ServiceUrl
        Credential  = $Credential
        Method      = 'Post'
        Body        = $Body
        ContentType = 'application/json'
    }
    Invoke-InvokeWebRequest $Params | Out-Null
    if (!($Init.IsPresent)) {
        Write-Host "Test $TestName passes" -ForegroundColor Green
    }
}

Export-ModuleMember -Function Invoke-TestRunnerService