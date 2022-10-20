function Install-TestRunnerService {
    Invoke-CommandOnDockerHost {
        Param(
            $ContainerName
        )

        $LocalPath = "$($Env:TEMP)\TestRunnerService.app"
        if (Test-Path $LocalPath) {
            Remove-Item $LocalPath
        }

        Write-Host "Downloading test runner service to $LocalPath"
        Invoke-WebRequest "https://github.com/jimmymcp/test-runner-service/raw/master/James%20Pearson_Test%20Runner%20Service.app" -OutFile $LocalPath

        Write-Host "Publishing into container $ContainerName"
        Publish-NavContainerApp $ContainerName -appFile $LocalPath -sync -install -skipVerification
    } -Parameters (Get-ContainerName)
}

Export-ModuleMember -Function Install-TestRunnerService