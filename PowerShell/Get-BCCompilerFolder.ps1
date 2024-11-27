function Get-BCCompilerFolder {
    param(
        [boolean]$CreateIfNotFound = $true
    )

    $compilerFolder = Join-Path $($bccontainerhelperconfig.hostHelperFolder) 'compiler'
    $compilerFolders = $null
    if (Test-Path $compilerFolder) {
        $compilerFolders = Get-ChildItem $compilerFolder -Directory
    }

    if ($null -ne $compilerFolders) {
        return ($compilerFolders | Select-Object -First 1).FullName
    }
    elseif ($CreateIfNotFound) {
        Write-Host "Could not find a BC Compiler folder. Determining artifact url..." -ForegroundColor Yellow
        $artifactUrl = Get-BCArtifactUrl
        Write-Host "Creating BC compiler folder for artifact url: $artifactUrl" -ForegroundColor Yellow
        return New-BCCompilerFolder -ArtifactUrl $artifactUrl
    }
    else {
        throw "Could not find a BC Compiler folder. Please create one with the New-BCCompilerFolder command in BCContainerHelper and try again."
    }
}

Export-ModuleMember -Function Get-BCCompilerFolder