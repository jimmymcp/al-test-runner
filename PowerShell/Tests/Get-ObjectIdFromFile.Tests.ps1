Describe Get-ObjectIdFromFile {
    It 'returns codeunit id when the object definition is on the first line' {
        $CodeunitPath = Join-Path $TestDrive "Codeunit.al"
        Set-Content -Path $CodeunitPath -Value "codeunit 50000 Codeunit1
        {

        }"

        Get-ObjectIdFromFile $CodeunitPath | should -be 50000
    }

    It 'returns codeunit id when the object definition is not on the first line' {
        $CodeunitPath = Join-Path $TestDrive "Codeunit.al"
        Set-Content -Path $CodeunitPath -Value "
        /// <summary>
        /// What if there is some summary information at the top of the file instead?
        /// Codeunit 50001 contains some cool functionality, but that is a different codeunit
        /// </summary>
        codeunit 50000 Codeunit1
        {

        }"

        Get-ObjectIdFromFile $CodeunitPath | should -be 50000
    }
}