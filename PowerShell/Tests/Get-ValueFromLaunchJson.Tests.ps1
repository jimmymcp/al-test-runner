Describe Get-LaunchJson {
    Context "launch.json has no comments" {
        It "create the PowerShell object from the JSON correctly" {
            $LaunchPath = Join-Path $TestDrive 'launch.json'
            Set-Content -Path $LaunchPath `
                -Value '{"version": "0.2.0", "configurations": [{"name": "configone", "server": "serverone"},{"name": "configtwo", "server": "servertwo"}]}'
            
            Get-LaunchJson -Path $LaunchPath
        }
    }

    Context "launch.json has line comments" {
        It "create the PowerShell object from the JSON correctly" {
            $LaunchPath = Join-Path $TestDrive 'launch.json'
            Set-Content -Path $LaunchPath `
                -Value `
                '{
                    "version": "0.2.0",
                    "configurations": [
                        //{
                        //    "name": "configone",
                        //    "server": "serverone"
                        //},
                        {
                            "name": "configtwo",
                            "server": "servertwo"
                        }
                    ]
                }'
            
            (Get-LaunchJson -Path $LaunchPath).configurations.Length | should -be 1
        }
    }

    Context "launch.json has block comments" {
        It "create the PowerShell object from the JSON correctly" {
            $LaunchPath = Join-Path $TestDrive 'launch.json'
            Set-Content -Path $LaunchPath `
                -Value `
                '{
                    "version": "0.2.0",
                    "configurations": [
                        /*{
                            "name": "configone",
                            "server": "serverone"
                        },*/
                        {
                            "name": "configtwo",
                            "server": "servertwo"
                        }
                    ]
                }'
            
            (Get-LaunchJson -Path $LaunchPath).configurations.Length | should -be 1
        }
    }

    Context "LaunchConfig is passed" {
        It "returns the KeyName that is requested from the config" {
            Get-ValueFromLaunchJson -LaunchConfig '{"name": "testconfig", "server": "serverone"}' -KeyName 'server' | should -be 'serverone'
        }
    }
}