Describe Merge-ALTestRunnerTestResults {
    BeforeAll {
        function Get-SingleAssemblyTestResults {
            return '<assemblies><assembly name="9093548 Licensing Test CDLTMN" test-framework="PS Test Runner" run-date="2019-11-12" run-time="09:16:44" total="5" passed="5" failed="0" skipped="0" time="0.802"><collection name="Licensing Test CDLTMN" total="5" passed="5" failed="0" skipped="0" time="0.802" Skipped="0"><test name="Licensing Test CDLTMN:ExpiredLicenseErrorsOnUpload" method="ExpiredLicenseErrorsOnUpload" time="0.414" result="Pass" /><test name="Licensing Test CDLTMN:NotificationShownWhenOpeningDocProcessWithExpiredLicense" method="NotificationShownWhenOpeningDocProcessWithExpiredLicense" time="0.227" result="Pass" /><test name="Licensing Test CDLTMN:NotificationShownWhenOpeningDocLinksSetupWithExpiredLicense" method="NotificationShownWhenOpeningDocLinksSetupWithExpiredLicense" time="0.08" result="Pass" /><test name="Licensing Test CDLTMN:NotificationShownWhenOpeningDocProcessWithExpiringLicense" method="NotificationShownWhenOpeningDocProcessWithExpiringLicense" time="0.054" result="Pass" /><test name="Licensing Test CDLTMN:NotificationShownWhenOpeningDocLinksSetupWithExpiringLicense" method="NotificationShownWhenOpeningDocLinksSetupWithExpiringLicense" time="0.027" result="Pass" /></collection></assembly></assemblies>'
        }

        function Get-MultipleAssemblyTestResults {
            return '<assemblies><assembly name="9030215 Global Search Tests GBSTMN" test-framework="PS Test Runner" run-date="2019-11-11" run-time="17:01:13" total="6" passed="6" failed="0" skipped="0" time="4.294"><collection name="Global Search Tests GBSTMN" total="6" passed="6" failed="0" skipped="0" time="4.294" Skipped="0"><test name="Global Search Tests GBSTMN:ItemNoSearchFromGlobalSearchPage" method="ItemNoSearchFromGlobalSearchPage" time="0.693" result="Pass" /><test name="Global Search Tests GBSTMN:ItemNoSearchFromItemListPage" method="ItemNoSearchFromItemListPage" time="1.293" result="Pass" /><test name="Global Search Tests GBSTMN:CustomerNoSearchFromCustomerListPage" method="CustomerNoSearchFromCustomerListPage" time="1.067" result="Pass" /><test name="Global Search Tests GBSTMN:VendorNoSearchFromVendorListPage" method="VendorNoSearchFromVendorListPage" time="0.817" result="Pass" /><test name="Global Search Tests GBSTMN:SearchCustomer" method="SearchCustomer" time="0.187" result="Pass" /><test name="Global Search Tests GBSTMN:SearchAllTerms" method="SearchAllTerms" time="0.237" result="Pass" /></collection></assembly><assembly name="9030216 Global Obfuscate Tests GBSTMN" test-framework="PS Test Runner" run-date="2019-11-09" run-time="13:41:38" total="1" passed="1" failed="0" skipped="0" time="0.284">  <collection name="Global Obfuscate Tests GBSTMN" total="1" passed="1" failed="0" skipped="0" time="0.284" Skipped="0">    <test name="Global Obfuscate Tests GBSTMN:ObfuscateCustomerName" method="ObfuscateCustomerName" time="0.25" result="Pass" />    <test name="Global Obfuscate Tests GBSTMN:ObfuscatePrimaryKeyField" method="ObfuscatePrimaryKeyField" time="0.37" result="Pass" />  </collection></assembly></assemblies>'
        }

        function Get-SingleTestResult {
            return '<assemblies><assembly name="9093548 Licensing Test CDLTMN" test-framework="PS Test Runner" run-date="2019-11-12" run-time="09:16:44" total="1" passed="0" failed="1" skipped="0" time="0.802"><collection name="Licensing Test CDLTMN" total="1" passed="0" failed="1" skipped="0" time="0.802" Skipped="0"><test name="Licensing Test CDLTMN:ExpiredLicenseErrorsOnUpload" method="ExpiredLicenseErrorsOnUpload" time="0.414" result="Fail"><failure><message>There was an error</message><stack-trace>This was the stack trace</stack-trace></failure></test></collection></assembly></assemblies>'
        }

        function Get-TestResultWithIllegalFilenameCharacters {
            return '<assemblies><assembly name="9093548 A/B\C?DE|:F Test" test-framework="PS Test Runner" run-date="2019-11-12" run-time="09:16:44" total="1" passed="0" failed="1" skipped="0" time="0.802"><collection name="Licensing Test CDLTMN" total="1" passed="0" failed="1" skipped="0" time="0.802" Skipped="0"><test name="Licensing Test CDLTMN:ExpiredLicenseErrorsOnUpload" method="ExpiredLicenseErrorsOnUpload" time="0.414" result="Fail"><failure><message>There was an error</message><stack-trace>This was the stack trace</stack-trace></failure></test></collection></assembly></assemblies>'
        }
    }

    Context 'Results file with single assembly (results from single test codeunit' {
        It 'should create a single file in the results folder named after the test codeunit' {
            $ResultsFile = Join-Path $TestDrive 'Results.xml'
            Set-Content -Path $ResultsFile -Value (Get-SingleAssemblyTestResults)
            Merge-ALTestRunnerTestResults -ResultsFile $ResultsFile -ToPath (Join-Path $TestDrive 'Results')
            Test-Path (Join-Path (Join-Path $TestDrive 'Results') '9093548 Licensing Test CDLTMN.xml') | should -be $true
        }        
    }

    Context 'Results file with multiple assemblies (results from multiple test codeunits' {
        It 'should create a separate file for each test codeunit present in the results file' {
            $ResultsFile = Join-Path $TestDrive 'Results.xml'
            Set-Content -Path $ResultsFile -Value (Get-MultipleAssemblyTestResults)
            Merge-ALTestRunnerTestResults -ResultsFile $ResultsFile -ToPath (Join-Path $TestDrive 'Results')
            Test-Path (Join-Path (Join-Path $TestDrive 'Results') '9030216 Global Obfuscate Tests GBSTMN.xml') | should -be $true
            Test-Path (Join-Path (Join-Path $TestDrive 'Results') '9030215 Global Search Tests GBSTMN.xml') | should -be $true
        }
    }

    Context 'Test method already exists in the results file' {
        It 'should update the existing file with the latest result' {
            $ResultsFile = Join-Path $TestDrive 'Results.xml'
            Set-Content -Path $ResultsFile -Value (Get-SingleAssemblyTestResults)
            Merge-ALTestRunnerTestResults -ResultsFile $ResultsFile -ToPath (Join-Path $TestDrive 'Results')
            
            
            Set-Content -Path $ResultsFile -Value (Get-SingleTestResult)
            Merge-ALTestRunnerTestResults -ResultsFile $ResultsFile -ToPath (Join-Path $TestDrive 'Results')
            [xml]$TestResults = Get-Content -Path (Join-Path (Join-Path $TestDrive 'Results') '9093548 Licensing Test CDLTMN.xml')
            $Nodes = $TestResults.SelectNodes('/assembly/collection/test[@method="ExpiredLicenseErrorsOnUpload"]')
            $Nodes.Count | should -be 1
            $Node = $Nodes.Item(0)
            $Node.result | should -be 'Fail'
            $Node.failure.message | should -be 'There was an error'
        }
    }

    Context 'Results file with test assembly with illegal filename characters' {
        It 'should remove the illegal characters from the filename' {
            $ResultsFile = Join-Path $TestDrive 'Results.xml'
            Set-Content -Path $ResultsFile -Value (Get-TestResultWithIllegalFilenameCharacters)
            Merge-ALTestRunnerTestResults -ResultsFile $ResultsFile -ToPath (Join-Path $TestDrive 'Results')
            Test-Path (Join-Path (Join-Path $TestDrive 'Results') '9093548 ABCDEF Test.xml') | should -be $true
        }
    }
}