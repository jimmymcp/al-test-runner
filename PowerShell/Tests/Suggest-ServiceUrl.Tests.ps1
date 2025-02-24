Describe Suggest-ServiceUrl {
    BeforeAll {
        Mock -CommandName 'Get-ValueFromALTestRunnerConfig' -ParameterFilter { $KeyName -eq 'companyName' } -MockWith { return 'My Company' } -ModuleName ALTestRunner
        Mock -CommandName 'Get-ValueFromALTestRunnerConfig' -ParameterFilter { $KeyName -eq 'launchConfigName' } -MockWith { return 'defaultConfig' } -ModuleName ALTestRunner
        Mock -CommandName 'Get-DockerHostIsRemote' -MockWith { return $false } -ModuleName ALTestRunner
    }

    It 'Should suggest url for local container not specifying port number in launch config using SOAP' {
        $LaunchConfig = '{"server": "http://containername", "serverInstance": "BC"}'
        Suggest-ServiceUrl -LaunchConfig $LaunchConfig -UseSOAP | Should -Be 'http://containername:7047/BC/WS/My Company/Codeunit/TestRunner?tenant=default'
    }

    It 'Should suggest url for local container not specifying port number in launch config using REST' {
        $LaunchConfig = '{"server": "http://containername", "serverInstance": "BC"}'
        Suggest-ServiceUrl -LaunchConfig $LaunchConfig | Should -Be 'http://containername:7048/BC/ODataV4/TestRunner?company=My Company&tenant=default'
    }

    It 'Should suggest url for local container specifying port 443 in launch config using SOAP' {
        $LaunchConfig = '{"server": "http://containername", "serverInstance": "BC", "port": 443}'
        Suggest-ServiceUrl -LaunchConfig $LaunchConfig -UseSOAP | Should -Be 'https://containername/BCsoap/WS/My Company/Codeunit/TestRunner?tenant=default'
    }

    It 'Should suggest url for local container specifying port 443 in launch config using REST' {
        $LaunchConfig = '{"server": "http://containername", "serverInstance": "BC", "port": 443}'
        Suggest-ServiceUrl -LaunchConfig $LaunchConfig | Should -Be 'https://containername/BCrest/ODataV4/TestRunner?company=My Company&tenant=default'
    }
}