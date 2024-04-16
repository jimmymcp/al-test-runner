function Get-PerformanceProfile {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    $ServiceUrl = Get-ServiceUrl -Method 'GetPerformanceProfile' -LaunchConfig $LaunchConfig
    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig

    $PerformanceProfilePath = './.altestrunner/PerformanceProfile.alcpuprofile'

    Write-Host "Downloading performance profile to $PerformanceProfilePath"

    if (Get-UrlIsForOData $ServiceUrl) {
        $Params = @{
            Uri         = $ServiceUrl
            Credential  = $Credential
            Method      = 'Post'
            ContentType = 'application/json'
        }

        $responseData = (Invoke-InvokeWebRequest $Params).Content
        if ($responseData) {
            $Result = $responseData | ConvertFrom-Json
        }
        if ($null -ne $Result) {
            $PerformanceProfile = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Result.value))
            Set-Content -Path $PerformanceProfilePath -Value $PerformanceProfile
        }
        else {
            Write-Host "Could not download performance profile. Please ensure at least v1.4 of the Test Runner Service app is installed." -ForegroundColor DarkRed
        }
    }
    else {
        $Body = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="urn:microsoft-dynamics-schemas/codeunit/TestRunner"><soapenv:Header/><soapenv:Body><tes:GetPerformanceProfile/></soapenv:Body></soapenv:Envelope>'
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
        $Result = $ResultXml.Envelope.Body.GetPerformanceProfile_Result.InnerText
        
        $PerformanceProfile = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Result))
        Set-Content -Path $PerformanceProfilePath -Value $PerformanceProfile
    }
}

Export-ModuleMember -Function Get-PerformanceProfile