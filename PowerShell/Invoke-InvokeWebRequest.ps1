function Invoke-InvokeWebRequest {
    param(
        $Params
    )

    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $Params.Add('AllowUnencryptedAuthentication', $true)
    }

    try {
        $response = Invoke-WebRequest @Params

        # Check if response is a SOAP fault
        if ($response.Content -match '<s:Fault>' -or $response.Content -match '<faultcode>') {
            try {
                [xml]$faultXml = $response.Content
                $faultString = $faultXml.Envelope.Body.Fault.faultstring

                if ($faultString -match 'Service "(.+?)" was not found') {
                    Write-Host "⚠️ Test Runner Service Error: $faultString" -ForegroundColor DarkRed
                    Write-Host "" -ForegroundColor DarkRed
                    Write-Host "This usually means:" -ForegroundColor Yellow
                    Write-Host "  1. The Test Runner Service app is not installed" -ForegroundColor Yellow
                    Write-Host "  2. The testRunnerServiceUrl in .altestrunner config is incorrect" -ForegroundColor Yellow
                    Write-Host "  3. The codeunit name in the service URL doesn't match the installed app" -ForegroundColor Yellow
                    Write-Host "" -ForegroundColor Yellow
                    Write-Host "To fix this:" -ForegroundColor Cyan
                    Write-Host "  • Run command: AL Test Runner: Install Test Runner Service" -ForegroundColor Cyan
                    Write-Host "  • Or verify your testRunnerServiceUrl setting in .altestrunner config" -ForegroundColor Cyan
                } else {
                    Write-Host "⚠️ SOAP Service Error: $faultString" -ForegroundColor DarkRed
                }

                throw "SOAP Fault: $faultString"
            }
            catch {
                if ($_.Exception.Message -notmatch '^SOAP Fault:') {
                    Write-Host "⚠️ Service returned an error but could not parse it" -ForegroundColor DarkRed
                    Write-Host $response.Content -ForegroundColor DarkRed
                }
                throw
            }
        }

        return $response
    }
    catch {
        $errorObject = $_

        # Don't re-process SOAP faults we already handled
        if ($errorObject.Exception.Message -match '^SOAP Fault:') {
            throw
        }

        try {
            $ErrorDetails = ConvertFrom-Json $_.ErrorDetails
            Write-Host $ErrorDetails.error.message -ForegroundColor DarkRed
        }
        catch {
            # Probably not a JSON formatted error
            Write-Host $errorObject -ForegroundColor DarkRed
            if ($errorObject.ErrorDetails.Message -match 'Unable to read data from the transport connection') {
                Write-Host "Are you trying to connect to a SSL port with `"http://`" instead of `"https://`"? (Uri: $($Params.Uri))" -ForegroundColor DarkRed
            } else {
                Write-Host $errorObject
            }
        }
        throw
    }
}

Export-ModuleMember Invoke-InvokeWebRequest