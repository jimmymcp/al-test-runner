function Select-ExecutionMethod {	
		$ExecutionMethod = Get-ValueFromALTestRunnerConfig -KeyName "executionPreference"

		if ([string]::IsNullOrEmpty($ExecutionMethod)) {
				$Options = @("Local","Remote")
				
				$ExecutionMethod = Get-SelectionFromUser -Options $Options -Prompt "Please select your preferred executionMethod:"
        if ($ExecutionMethod -eq '') {
            throw
				}
				
				Set-ALTestRunnerConfigValue -KeyName 'executionPreference' -KeyValue $ExecutionMethod
    		return $ExecutionMethod
		}
}