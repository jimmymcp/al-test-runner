Describe Select-BCCompany {
    InModuleScope ALTestRunner {
        Mock Get-ServerFromLaunchJson {return 'bc'}
        Mock Set-ALTestRunnerConfigValue {}
        Context 'There is a single BC company in the container' {
            Mock Get-CompanyInBCContainer {
                $Company = New-Object System.Object
                $Company | Add-Member -MemberType NoteProperty -Name CompanyName -Value 'ACME Corporation'
                return $Company
            }

            It 'should return the name of that company' {
                Select-BCCompany | should be 'ACME Corporation'
                Assert-MockCalled Set-ALTestRunnerConfigValue
            }
        }

        Context 'There are multiple companies in the container' {
            Mock Get-CompanyInBCContainer {
                $Companies = @()
                $Company = New-Object System.Object
                $Company | Add-Member -MemberType NoteProperty -Name CompanyName -Value 'ACME Corporation'
                $Companies += $Company
                $Company = New-Object System.Object
                $Company | Add-Member -MemberType NoteProperty -Name CompanyName -Value 'CRONUS International Ltd'
                $Companies += $Company
                return $Companies
            }

            It 'should prompt the user to select the correct company' {
                Mock Get-SelectionFromUser {return 'CRONUS International Ltd'}
                Select-BCCompany | should be 'CRONUS International Ltd'
                Assert-MockCalled Get-SelectionFromUser -Times 1
                Assert-MockCalled Set-ALTestRunnerConfigValue
            }
        }
    }
}