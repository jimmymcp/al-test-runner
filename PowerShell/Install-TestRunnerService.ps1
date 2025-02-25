function Install-TestRunnerService {
    Param(
        [Parameter(Mandatory = $false)]
        $LaunchConfig
    )

    # do not attempt to install Test Runner Service in an alpaca container
    if ((Get-ValueFromLaunchJson -KeyName 'server' -LaunchConfig $LaunchConfig).ToLower().contains('alpaca')) {
        return
    }

    Invoke-CommandOnDockerHost {
        Param(
            $ContainerName
        )

        $LocalPath = "$($Env:TEMP)\TestRunnerService.app"
        if (Test-Path $LocalPath) {
            Remove-Item $LocalPath
        }

        $ContainerMajorVersion = [Int32]::Parse((Get-BcContainerNavVersion $ContainerName).Split('.')[0])

        if ($ContainerMajorVersion -lt 22) {
            Write-Host "Downloading pre-BC 22 test runner service to $LocalPath"
            Invoke-WebRequest "https://github.com/jimmymcp/test-runner-service/raw/master/James%20Pearson_Test%20Runner%20Service_pre22.app" -OutFile $LocalPath
        }
        else {
            Write-Host "Downloading test runner service to $LocalPath"
            Invoke-WebRequest "https://github.com/jimmymcp/test-runner-service/raw/master/James%20Pearson_Test%20Runner%20Service.app" -OutFile $LocalPath
        }

        Write-Host "Publishing into container $ContainerName"
        Publish-NavContainerApp $ContainerName -appFile $LocalPath -sync -install -skipVerification
    } -Parameters (Get-ContainerName -LaunchConfig $LaunchConfig)
}

Export-ModuleMember -Function Install-TestRunnerService