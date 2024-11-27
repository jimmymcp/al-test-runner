function Get-TableIDFromName {
    param (
        [Parameter(Mandatory = $true)]
        [string]$TableName,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    $ServiceUrl = Get-ServiceUrl -Method GetTableIDFromName -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential

    if (Get-UrlIsForOData $ServiceUrl) {
        $Params = @{
            Uri         = $ServiceUrl
            Credential  = $Credential
            Method      = 'Post' 
            ContentType = 'application/json'
            Body        = ("{`"tableName`": `"$TableName`"}")
        }
        $Result = Invoke-InvokeWebRequest $Params
        $Result = $Result | ConvertFrom-Json
        $TableNo = $Result.value
    }
    else {
        $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner">
            <soapenv:Header/>
                <soapenv:Body>
                    <tes:GetTableIDFromName>
                        <tes:tableName>' + $TableName + '</tes:tableName>
                    </tes:GetTableIDFromName>
                </soapenv:Body>
            </soapenv:Envelope>'
        $Headers = (@{SOAPAction='Read'})
        $Params = @{
            Uri = $ServiceUrl
            Method = 'Post'
            ContentType = 'application/xml'
            Body = $Body
            Headers = $Headers
            Credential  = $Credential
        }

        $Result = (Invoke-InvokeWebRequest $Params).Content
        [xml]$ResultXml = $Result
        $TableNo = $ResultXml.Envelope.Body.GetTableIDFromName_Result.InnerText
    }

    return $TableNo
}