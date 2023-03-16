function Publish-App {
    param(
        [Parameter(Mandatory = $false)]
        [string]$ContainerName,
        [Parameter(Mandatory = $true)]
        [string]$AppFile,
        [Parameter(Mandatory = $true)]
        [string]$CompletionPath,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    if ([String]::IsNullOrEmpty($ContainerName)) {
        $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
    }

    if (Test-Path $CompletionPath) {
        Remove-Item $CompletionPath -Force
    }

    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig
    Import-ContainerHelper
    
    try {
        Publish-BcContainerApp $ContainerName -appFile $AppFile -skipVerification -useDevEndpoint -credential $Credential
        Set-Content $CompletionPath '1'
    }
    catch {
        Set-Content $CompletionPath $_
    }
}

Export-ModuleMember -Function Publish-App