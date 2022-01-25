Describe Get-FilterFromIDRanges {
    Context "app.json has a single id range" {
        It "returns from..to from the id range" {
            $AppJsonPath = Join-Path $TestDrive "app.json"
            Set-Content -Path $AppJsonPath `
                -Value '{"idRanges": [{"from": 50000, "to": 50100}]}'

            Get-FilterFromIDRanges $AppJsonPath | should -be "50000..50100"
        }
    }

    Context "app.json has two id ranges" {
        It "returns from1..to1|from2..to2" {
            $AppJsonPath = Join-Path $TestDrive "app.json"
            Set-Content -Path $AppJsonPath `
                -Value '{"idRanges": [{"from": 50000, "to": 50100}, {"from": 60000, "to": 60020}]}'

            Get-FilterFromIDRanges $AppJsonPath | should -be "50000..50100|60000..60020"
        }
    }

    Context "app.json has idRange (instead of an idRanges) property" {
        It "returns from..to" {
            $AppJsonPath = Join-Path $TestDrive "app.json"
            Set-Content -Path $AppJsonPath `
                -Value '{"idRange": {"from": 70000, "to": 70050}}'

            Get-FilterFromIDRanges $AppJsonPath | should -be "70000..70050"
        }
    }

    Context "app.json does't have an idRange at all" {
        It "returns blank" {
            $AppJsonPath = Join-Path $TestDrive "app.json"
            Set-Content -Path $AppJsonPath `
                -Value '{}'

            Get-FilterFromIDRanges $AppJsonPath | should -be ""
        }
    }
}