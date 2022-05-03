Describe Get-ServerFromLaunchJson {
    InModuleScope ALTestRunner {
        It 'should remove a trailing slash from the server name if present' {
            Mock Get-LaunchJsonPath {Join-Path $TestDrive 'launch.json'}
            Set-Content -Path (Join-Path $TestDrive 'launch.json') -Value '{configurations: [{"type": "al", "name": "test", "server": "http://test/"}]}'
            Get-ServerFromLaunchJson -ConfigName 'test' | should -be 'test'
        }

        It 'should return the server name correctly when no trailing slash present' {
            Mock Get-LaunchJsonPath {Join-Path $TestDrive 'launch.json'}
            Set-Content -Path (Join-Path $TestDrive 'launch.json') -Value '{configurations: [{"type": "al", "name": "test", "server": "http://test"}]}'
            Get-ServerFromLaunchJson -ConfigName 'test' | should -be 'test'
        }

        It 'should remove a port number from the server if present' {
            Mock Get-LaunchJsonPath {Join-Path $TestDrive 'launch.json'}
            Set-Content -Path (Join-Path $TestDrive 'launch.json') -Value '{configurations: [{"type": "al", "name": "test", "server": "http://test:1234"}]}'
            Get-ServerFromLaunchJson -ConfigName 'test' | should -be 'test'
        }
    }
}