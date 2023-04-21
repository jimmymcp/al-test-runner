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
        try {
            $ErrorDetails = ConvertFrom-Json $_.ErrorDetails
            Write-Host $ErrorDetails.error.message -ForegroundColor DarkRed
        }
        catch {
            Write-Host $_ -ForegroundColor DarkRed
        }
    }
}

Export-ModuleMember Invoke-InvokeWebRequest