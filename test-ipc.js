#!/usr/bin/env node

/**
 * IPC Validation Script
 * 
 * This script tests all registered IPC channels to ensure they're working correctly.
 * It simulates renderer-side calls to validate the main process handlers.
 */

const { ipcRenderer } = require('electron');

async function testIPCChannels() {
  console.log('🧪 Starting IPC Channel Validation...\n');
  
  const results = [];
  
  // Test channels
  const tests = [
    {
      name: 'Ping Test',
      channel: 'test:ping',
      args: undefined,
      expected: (result) => result.message === 'pong'
    },
    {
      name: 'File Select',
      channel: 'file:select',
      args: undefined,
      expected: (result) => result.success === true
    },
    {
      name: 'File Validate', 
      channel: 'file:validate',
      args: { filePath: 'test.mp4' },
      expected: (result) => result.hasOwnProperty('isValid')
    },
    {
      name: 'File Save Location',
      channel: 'file:save-location', 
      args: undefined,
      expected: (result) => result.success === true
    },
    {
      name: 'Conversion Start',
      channel: 'conversion:start',
      args: { inputPath: 'test.mp4', outputPath: 'output.mp4', settings: {} },
      expected: (result) => result.success === true
    },
    {
      name: 'Conversion Cancel',
      channel: 'conversion:cancel',
      args: { jobId: 'test-job-123' },
      expected: (result) => result.success === true
    },
    {
      name: 'App Get Session',
      channel: 'app:get-session',
      args: undefined,
      expected: (result) => result.session && result.session.id
    },
    {
      name: 'App Get Preferences',
      channel: 'app:get-preferences',
      args: undefined,
      expected: (result) => result.preferences && result.preferences.theme
    },
    {
      name: 'App Set Preferences',
      channel: 'app:set-preferences',
      args: { preferences: { theme: 'dark' } },
      expected: (result) => result.success === true
    },
    {
      name: 'App Info',
      channel: 'app:info',
      args: undefined,
      expected: (result) => result.appInfo && result.appInfo.name
    },
    {
      name: 'System Show in Explorer',
      channel: 'system:show-in-explorer',
      args: { path: 'test.mp4' },
      expected: (result) => result.success === true
    },
    {
      name: 'System Open External',
      channel: 'system:open-external',
      args: { url: 'https://example.com' },
      expected: (result) => result.success === true
    }
  ];

  // Run tests
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      
      const startTime = Date.now();
      const result = await ipcRenderer.invoke(test.channel, test.args);
      const duration = Date.now() - startTime;
      
      const passed = test.expected(result);
      
      results.push({
        name: test.name,
        channel: test.channel,
        passed,
        duration,
        result: passed ? 'PASS' : 'FAIL',
        response: result
      });
      
      console.log(`  ✅ ${test.name}: PASS (${duration}ms)`);
    } catch (error) {
      results.push({
        name: test.name,
        channel: test.channel, 
        passed: false,
        duration: 0,
        result: 'ERROR',
        error: error.message
      });
      
      console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total} tests`);
  console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All IPC channels are working correctly!');
  } else {
    console.log('\n⚠️  Some IPC channels have issues:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error || 'Validation failed'}`);
    });
  }
  
  return results;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testIPCChannels };
}

// Run if called directly
if (require.main === module) {
  testIPCChannels().catch(console.error);
}