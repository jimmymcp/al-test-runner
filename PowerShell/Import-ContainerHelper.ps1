function Import-ContainerHelper {

    $customBcContainerHelperScriptPath = Get-ValueFromALTestRunnerConfig -KeyName 'customBcContainerHelperScriptPath'

    if ($customBcContainerHelperScriptPath) {
        Invoke-CommandOnDockerHost -Command { . $customBcContainerHelperScriptPath }
    }
    else {
        if (Test-PowerShellModule 'bccontainerhelper') {
            Import-PowerShellModule 'bccontainerhelper'
        }
        else {
            Import-PowerShellModule 'navcontainerhelper'
        }
    }
}

Export-ModuleMember -Function Import-ContainerHelper