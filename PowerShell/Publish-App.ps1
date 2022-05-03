function Publish-App {
    param(
        [string]$ContainerName = (Get-ContainerName),
        [string]$AppFile,
        [string]$CompletionPath
    )

    if (Test-Path $CompletionPath) {
        Remove-Item $CompletionPath -Force
    }

    $Credential = Get-ALTestRunnerCredential
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