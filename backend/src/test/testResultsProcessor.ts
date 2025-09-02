import { AggregatedResult } from '@jest/test-result';

/**
 * Custom test results processor for enhanced reporting
 */
export default function testResultsProcessor(results: AggregatedResult): AggregatedResult {
  // Log test summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.numPassedTests}`);
  console.log(`❌ Failed: ${results.numFailedTests}`);
  console.log(`⏭️  Skipped: ${results.numPendingTests}`);
  console.log(`📁 Test Suites: ${results.numPassedTestSuites}/${results.numTotalTestSuites}`);
  console.log(`⏱️  Time: ${(results.testResults.reduce((acc, result) => acc + (result.perfStats.end - result.perfStats.start), 0) / 1000).toFixed(2)}s`);

  // Log coverage summary if available
  if (results.coverageMap) {
    console.log('\n📈 Coverage Summary:');
    const summary = results.coverageMap.getCoverageSummary();
    console.log(`Lines: ${summary.lines.pct}%`);
    console.log(`Functions: ${summary.functions.pct}%`);
    console.log(`Branches: ${summary.branches.pct}%`);
    console.log(`Statements: ${summary.statements.pct}%`);
  }

  // Log failed tests details
  if (results.numFailedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.testResults.forEach(testResult => {
      if (testResult.numFailingTests > 0) {
        console.log(`\n📁 ${testResult.testFilePath}`);
        testResult.testResults.forEach(test => {
          if (test.status === 'failed') {
            console.log(`  ❌ ${test.fullName}`);
            if (test.failureMessages.length > 0) {
              console.log(`     ${test.failureMessages[0].split('\n')[0]}`);
            }
          }
        });
      }
    });
  }

  // Log slow tests
  const slowTests = results.testResults
    .filter(result => (result.perfStats.end - result.perfStats.start) > 5000)
    .sort((a, b) => (b.perfStats.end - b.perfStats.start) - (a.perfStats.end - a.perfStats.start));

  if (slowTests.length > 0) {
    console.log('\n🐌 Slow Tests (>5s):');
    slowTests.slice(0, 5).forEach(test => {
      const duration = ((test.perfStats.end - test.perfStats.start) / 1000).toFixed(2);
      console.log(`  ⏱️  ${test.testFilePath} (${duration}s)`);
    });
  }

  console.log('\n');

  return results;
}