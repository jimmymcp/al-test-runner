Describe Get-ContainerName {
    InModuleScope 'ALTestRunner' {
        Mock Set-ALTestRunnerConfigValue {}
        Context 'Docker host is not remote' {
            Mock Get-DockerHostIsRemote {$false}
            Mock Get-ServerFromLaunchJson {'launchJsonServer'}
            It 'should return the server name from launch.json' {
                Get-ContainerName | should be 'launchJsonServer'
            }
        }

        Context 'Docker host is remote, remoteContainerName is null' {
            Mock Get-DockerHostIsRemote {$true}
            Mock Get-ValueFromALTestRunnerConfig {$null} -ParameterFilter {$KeyName -eq 'remoteContainerName'}
            Mock Read-Host {'testContainer'}
            It 'should prompt for the name of the remoteContainerName' {
                Get-ContainerName
                Assert-MockCalled Read-Host
            }
        }

        Context 'Docker host is remote, remoteContainerName is blank' {
            Mock Get-DockerHostIsRemote {$true}
            Mock Get-ValueFromALTestRunnerConfig {''} -ParameterFilter {$KeyName -eq 'remoteContainerName'}
            Mock Read-Host {'testContainer'}
            It 'should prompt for the name of the remoteContainerName' {
                Get-ContainerName
                Assert-MockCalled Read-Host
            }
        }

        Context 'Docker host is remote, remoteContainerName is populated' {
            Mock Get-DockerHostIsRemote {$true}
            Mock Get-ValueFromALTestRunnerConfig {'testContainer'} -ParameterFilter {$KeyName -eq 'remoteContainerName'}
            Mock Read-Host {'testContainer'}
            It 'should prompt for the name of the remoteContainerName' {
                Get-ContainerName | should be 'testContainer'
            }
        }
    }
}