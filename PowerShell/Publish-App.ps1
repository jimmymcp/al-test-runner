function Publish-App {
    param(
        [Parameter(Mandatory = $false)]
        [string]$ContainerName,
        [Parameter(Mandatory = $true)]
        [string]$AppFile,
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    if ([String]::IsNullOrEmpty($ContainerName)) {
        $ContainerName = Get-ContainerName -LaunchConfig $LaunchConfig
    }

    $Credential = Get-ALTestRunnerCredential -LaunchConfig $LaunchConfig
    Import-ContainerHelper

    Publish-BcContainerApp $ContainerName -appFile $AppFile -skipVerification -useDevEndpoint -credential $Credential
}

Export-ModuleMember -Function Publish-App