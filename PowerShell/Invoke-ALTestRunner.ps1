function Invoke-ALTestRunner {
    Param(
        [Parameter(Mandatory=$false)]
        [ValidateSet('All','Codeunit','Test')]
        [string]$Tests = 'All',
        [Parameter(Mandatory=$false)]
        [string]$FileName = '',
        [Parameter(Mandatory=$false)]
        [int]$SelectionStart = 0
    )
    $ContainerName = Get-ServerFromLaunchJson
    $CompanyName = 'My Company' #TODO
    $ExtensionId = Get-ValueFromAppJson -KeyName 'id'

    $Params = @{
        ContainerName = $ContainerName
        CompanyName = $CompanyName
        ExtensionId = $ExtensionId
    }
    
    if ($FileName -ne '') {
        $Params.Add('TestCodeunit', (Get-ObjectIdFromFile $FileName))
    }

    if ($SelectionStart -ne 0) {
        $Params.Add('TestFunction', (Get-TestNameFromSelectionStart -Path $FileName -SelectionStart $SelectionStart))
    }

    if ((Get-ValueFromLaunchJson -KeyName 'authentication') -eq 'UserPassword') {
        $Credential = Get-ALTestRunnerCredential
        $Params.Add('Credential', $Credential)
    }

    Invoke-RunTests @Params
}

Export-ModuleMember -Function Invoke-ALTestRunner