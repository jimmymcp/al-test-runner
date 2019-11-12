function Select-BCTestSuite {
    Write-Host "Please enter a test suite which contains the test codeuit(s) to run (required before BC15)" -ForegroundColor DarkYellow
    Write-Host "If blank, the DEFAULT test suite will be used" -ForegroundColor DarkYellow
    $TestSuite = Read-Host -Prompt 'Test Suite'
    if (($null -eq $TestSuite) -or ($TestSuite -eq '')) {
        $TestSuite = 'DEFAULT'
    }
    return $TestSuite
}

Export-ModuleMember -Function Select-BCTestSuite