Describe Get-UrlIsForOData {
    It 'should return true when the URL contains OData' {
        Get-UrlIsForOData -Url 'http://localhost:7048/BC/ODataV4/TestRunner?company=CRONUS%20International%20Ltd.&tenant=default' | should -be $true
    }

    It 'should return false when the URL does not contain OData' {
        Get-UrlIsForOData -Url 'http://localhost:7048/BC/WS/TestRunner?tenant=default' | should -be $false
    }
}