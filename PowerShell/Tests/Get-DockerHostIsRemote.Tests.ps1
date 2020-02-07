Describe Get-DockerHostIsRemote {
    InModuleScope 'ALTestRunner' {
        function New-ConfigFile {
            Param(
                [Parameter(Mandatory=$true)]
                [string]$Path,
                [Parameter(Mandatory=$true)]
                [string]$Value
            )

            Set-Content -Path $Path -Value $Value
        }

        Context 'dockerHost does not exist in config file' {
            It 'returns false' {
                New-ConfigFile -Path (Join-Path $TestDrive 'config.json') -Value '{}'
                Mock -CommandName Get-ALTestRunnerConfigPath {return Join-Path $TestDrive 'config.json'}
                Get-DockerHostIsRemote | should be $false
            }
        }
        Context 'dockerHost is blank in config file' {
            It 'returns false' {
                New-ConfigFile -Path (Join-Path $TestDrive 'config.json') -Value '{"dockerHost": ""}'
                Mock -CommandName Get-ALTestRunnerConfigPath {return Join-Path $TestDrive 'config.json'}
                Get-DockerHostIsRemote | should be $false
            }
        }
        Context 'dockerHost is not blank in config file' {
            It 'returns true' {
                New-ConfigFile -Path (Join-Path $TestDrive 'config.json') -Value '{"dockerHost": "my great server"}'
                Mock -CommandName Get-ALTestRunnerConfigPath {return Join-Path $TestDrive 'config.json'}
                Get-DockerHostIsRemote | should be $true
            }
        }
    }
}