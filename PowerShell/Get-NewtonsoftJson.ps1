function Get-NewtonsoftJsonPath {
    $dlls = Get-ChildItem -Path "$(Get-TestClientPath)\Newtonsoft.Json*\lib\net6.0\Newtonsoft.Json.dll"
    if ($dlls.Count -eq 0) {
        # Ensure nuget is available
        if (-not (Get-Command nuget -ErrorAction SilentlyContinue)) {
            Write-Host "nuget not found. Attempting to install via winget..." -NoNewline
            try {
                winget install --id Microsoft.NuGet --silent --accept-source-agreements --accept-package-agreements | Out-Null
                # Refresh PATH to pick up newly installed nuget
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                Write-Host " Done" -ForegroundColor Green
            }
            catch {
                Write-Host " Failed" -ForegroundColor Red
                throw "Failed to install nuget via winget. Please install nuget manually and ensure it's in your PATH."
            }

            # Verify installation
            if (-not (Get-Command nuget -ErrorAction SilentlyContinue)) {
                throw "nuget installation via winget appeared to succeed, but nuget is still not available in PATH. You may need to restart your terminal or install nuget manually."
            }
        }

        nuget install Newtonsoft.Json -OutputDirectory "$(Get-TestClientPath)" | Out-Null
        $dlls = Get-ChildItem -Path "$(Get-TestClientPath)\Newtonsoft.Json*\lib\net6.0\Newtonsoft.Json.dll"
    }

    if ($dlls.Count -eq 0) {
        throw "Could not find Newtonsoft.Json.dll"
    }

    ($dlls | Select-Object -First 1).FullName
}

Export-ModuleMember -Function Get-NewtonsoftJsonPath