function Invoke-InvokeWebRequest {
    param(
        $Params
    )

    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $Params.Add('AllowUnencryptedAuthentication', $true)
    }

    try {
        Invoke-WebRequest @Params
    }
    catch {
        $errorObject = $_
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
    }
}

Export-ModuleMember Invoke-InvokeWebRequest