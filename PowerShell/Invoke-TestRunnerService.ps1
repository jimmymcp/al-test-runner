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
        if (Get-UrlIsForOData $ServiceUrl) {
            $Body = "{`"codeunitIdFilter`": `"$CodeunitIDFilter`", `"testName`": `"$TestName`"}"
        }
        else {
            $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner">
            <soapenv:Header/>
            <soapenv:Body>
               <tes:RunTestsFromFilter>
                  <tes:codeunitIdFilter>' + $CodeunitIDFilter + '</tes:codeunitIdFilter>
                  <tes:testName>'+ $TestName + '</tes:testName>
               </tes:RunTestsFromFilter>
            </soapenv:Body>
         </soapenv:Envelope>'
        }
        Write-Host "Initialising test runner"
    }
    elseif ($FileName -ne '') {
        $ServiceUrl = Get-ServiceUrl -Method 'RunTest'
        $CodeunitId = Get-ObjectIdFromFile $FileName
        $TestName = Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart
        if (Get-UrlIsForOData $ServiceUrl) {
            $Body = "{`"codeunitId`": $CodeunitId, `"testName`": `"$TestName`"}"
        }
        else {
            $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner">
            <soapenv:Header/>
            <soapenv:Body>
               <tes:RunTest>
                  <tes:codeunitId>'+ $CodeunitId + '</tes:codeunitId>
                  <tes:testName>' + $TestName + '</tes:testName>
               </tes:RunTest>
            </soapenv:Body>
         </soapenv:Envelope>'
        }
    }
    else {
        $ServiceUrl = Get-ServiceUrl -Method 'RunTestsFromFilter'
        $CodeunitIDFilter = Get-FilterFromIDRanges
        $TestName = ''
        if (Get-UrlIsForOData $ServiceUrl) {
            $Body = "{`"codeunitIdFilter`": `"$CodeunitIDFilter`", `"testName`": `"$TestName`"}"
        }
        else {
            $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner">
            <soapenv:Header/>
            <soapenv:Body>
               <tes:RunTestsFromFilter>
                  <tes:codeunitIdFilter>' + $CodeunitIDFilter + '</tes:codeunitIdFilter>
                  <tes:testName>'+ $TestName + '</tes:testName>
               </tes:RunTestsFromFilter>
            </soapenv:Body>
         </soapenv:Envelope>'
        }
    }

    if (Get-UrlIsForOData $ServiceUrl) {
        $Params = @{
            Uri         = $ServiceUrl
            Credential  = $Credential
            Method      = 'Post'
            Body        = $Body
            ContentType = 'application/json'
        }
    }
    else {
        $Headers = (@{SOAPAction='Read'})
        $Params = @{
            Uri = $ServiceUrl
            Method = 'Post'
            ContentType = 'application/xml'
            Body = $Body
            Headers = $Headers
            Credential  = $Credential
        }
    }
    Invoke-InvokeWebRequest $Params | Out-Null
    if (!($Init.IsPresent)) {
        Write-Host "Test $TestName passes" -ForegroundColor Green
    }
}

Export-ModuleMember -Function Invoke-TestRunnerService