Describe Get-FileIsTestCodeunit {
    Context 'File is a test codeunit' {
        It 'should return true for an .al test file with a Subtype = Test line' {
            $FileName = Join-Path $TestDrive ([Guid]::NewGuid().Guid + '.al')
            Set-Content -Path $FileName -Value 'codeunit 50100 "Test Codeunit"
                {
                    Subtype = Test;
                }'
            Get-FileIsTestCodeunit $FileName | should be $true
        }

        It 'should return true for an .al test file with a SubType = Test line' {
            $FileName = Join-Path $TestDrive ([Guid]::NewGuid().Guid + '.al')
            Set-Content -Path $FileName -Value 'codeunit 50100 "Test Codeunit"
                {
                    SubType = Test;
                }'
            Get-FileIsTestCodeunit $FileName | should be $true
        }
    }

    Context 'File is a regular codeunit' {
        It 'should return false for an .al file which isn''t a test codeunit' {
            $FileName = Join-Path $TestDrive ([Guid]::NewGuid().Guid + '.al')
            Set-Content -Path $FileName -Value 'codeunit 50100 "Test Codeunit"
                {
                    procedure SomeTestMethod()
                    begin
                    end;
                }'
            Get-FileIsTestCodeunit $FileName | should be $false
        }
    }

    Context 'File is not a .al file' {
        It 'should return false for a file that doesn''t have .al extension' {
            $FileName = Join-Path $TestDrive ([Guid]::NewGuid().Guid + '.json')
            Set-Content -Path $FileName -Value '{
                    "key": "value",
                    "anotehr key": "another value"
                }'
            Get-FileIsTestCodeunit $FileName | should be $false
        }
    }
}