#!/usr/bin/env node

// Test the health service directly by simulating the environment
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('Could not load .env file:', error.message);
  }
}

loadEnv();

console.log('Environment loaded:');
console.log('ELASTICSEARCH_URL:', process.env.ELASTICSEARCH_URL);
console.log('ELASTICSEARCH_HEALTH_TIMEOUT:', process.env.ELASTICSEARCH_HEALTH_TIMEOUT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test the health check timeout issue
async function testHealthCheckTimeout() {
  console.log('\n='.repeat(60));
  console.log('TESTING HEALTH CHECK TIMEOUT ISSUE');
  console.log('='.repeat(60));
  
  const { Client } = require('@elastic/elasticsearch');
  
  const elasticsearchUrl = process.env.ELASTICSEARCH_URL;
  const healthTimeout = parseInt(process.env.ELASTICSEARCH_HEALTH_TIMEOUT) || 30000;
  
  console.log(`Testing with health timeout: ${healthTimeout}ms`);
  
  // Simulate the exact same logic as the health service
  const startTime = Date.now();
  
  try {
    // Create timeout promise (like in health service)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Elasticsearch health check timeout')), healthTimeout);
    });
    
    // Create health promise (like in search service)
    const searchServiceTimeout = Math.max(healthTimeout - 2000, 10000);
    console.log(`Search service timeout: ${searchServiceTimeout}ms`);
    
    const healthPromise = (async () => {
      // Simulate search service isHealthy method
      const client = new Client({
        node: elasticsearchUrl,
        requestTimeout: searchServiceTimeout,
        pingTimeout: Math.min(searchServiceTimeout, 10000),
        maxRetries: 1,
      });
      
      const pingTimeout = new Promise((resolve) => {
        setTimeout(() => {
          console.log('Search service ping timed out');
          resolve(false);
        }, searchServiceTimeout);
      });
      
      const pingPromise = client.ping()
        .then(() => {
          console.log('Elasticsearch ping successful');
          return true;
        })
        .catch(error => {
          console.log('Elasticsearch ping failed:', error.message);
          return false;
        });
      
      const result = await Promise.race([pingPromise, pingTimeout]);
      await client.close();
      return result;
    })();
    
    // Race between health promise and timeout (like in health service)
    const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;
    
    console.log(`\n✅ Health check completed successfully:`);
    console.log(`   Status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Timeout: ${healthTimeout}ms`);
    
    return { status: isHealthy ? 'healthy' : 'unhealthy', responseTime };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`\n❌ Health check failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Timeout: ${healthTimeout}ms`);
    
    return { status: 'unhealthy', responseTime, error: error.message };
  }
}

// Test with different scenarios
async function testDifferentScenarios() {
  console.log('\n='.repeat(60));
  console.log('TESTING DIFFERENT SCENARIOS');
  console.log('='.repeat(60));
  
  // Scenario 1: Normal timeout
  console.log('\n1. Testing with normal timeout (30s)...');
  process.env.ELASTICSEARCH_HEALTH_TIMEOUT = '30000';
  const result1 = await testHealthCheckTimeout();
  
  // Scenario 2: Short timeout
  console.log('\n2. Testing with short timeout (5s)...');
  process.env.ELASTICSEARCH_HEALTH_TIMEOUT = '5000';
  const result2 = await testHealthCheckTimeout();
  
  // Scenario 3: Very short timeout
  console.log('\n3. Testing with very short timeout (1s)...');
  process.env.ELASTICSEARCH_HEALTH_TIMEOUT = '1000';
  const result3 = await testHealthCheckTimeout();
  
  console.log('\n='.repeat(60));
  console.log('SCENARIO RESULTS');
  console.log('='.repeat(60));
  console.log(`30s timeout: ${result1.status} (${result1.responseTime}ms)`);
  console.log(`5s timeout:  ${result2.status} (${result2.responseTime}ms)`);
  console.log(`1s timeout:  ${result3.status} (${result3.responseTime}ms)`);
  
  if (result1.status === 'healthy' && result2.status === 'healthy' && result3.status === 'unhealthy') {
    console.log('\n✅ All scenarios behaved as expected!');
  } else {
    console.log('\n⚠️  Some scenarios had unexpected results.');
  }
}

testDifferentScenarios().catch(console.error);