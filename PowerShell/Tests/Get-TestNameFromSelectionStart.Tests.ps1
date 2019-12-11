Describe Get-TestNameFromSelectionStart {
    $Path = Join-Path $TestDrive ([Guid]::NewGuid().Guid + '.al')
    Set-Content -Path $Path -Value 'codeunit 50100 "Test Codeunit"
    {
        Subtype = Test;
        [Test]
        [HandlerFunctions(''MessageHandler'')]
        procedure ThisIsATest()
        begin
        end;
        [test]
        [HandlerFunctions(''MessageHandler'')]
        procedure ThisIsAnotherTest()
        begin
        end;
    }'

    Context 'Cursor is below a [Test] attribute line' {
        It 'should return the name of the procedure' {
            Get-TestNameFromSelectionStart -Path $Path -SelectionStart 4 | should be 'ThisIsATest'
        }
    }

    Context 'Cursor is above the first [Test] attribute line' {
        It 'should return blank' {
            Get-TestNameFromSelectionStart -Path $Path -SelectionStart 2 | should be ''
        }
    }

    Context 'Cursor is below a [test] (lower case) attribute line' {
        It 'should return the name of the procedure' {
            Get-TestNameFromSelectionStart -Path $Path -SelectionStart 11 | should be 'ThisIsAnotherTest'
        }
    }
}