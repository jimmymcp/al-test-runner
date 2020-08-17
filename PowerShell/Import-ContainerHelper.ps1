function Import-ContainerHelper {
    if (Test-PowerShellModule 'bccontainerhelper') {
        Import-PowerShellModule 'bccontainerhelper'
    }
    else {
        Import-PowerShellModule 'navcontainerhelper'
    }
}

Export-ModuleMember -Function Import-ContainerHelper