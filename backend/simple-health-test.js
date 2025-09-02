#!/usr/bin/env node

// Simple test to isolate the Elasticsearch health check issue
const fs = require('fs');
const path = require('path');

// Manually load .env file since dotenv might not be available
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('Could not load .env file:', error.message);
  }
}

loadEnv();

const { Client } = require('@elastic/elasticsearch');

console.log('Environment variables:');
console.log('ELASTICSEARCH_URL:', process.env.ELASTICSEARCH_URL);
console.log('ELASTICSEARCH_HEALTH_TIMEOUT:', process.env.ELASTICSEARCH_HEALTH_TIMEOUT);
console.log('HEALTH_CHECK_TIMEOUT:', process.env.HEALTH_CHECK_TIMEOUT);

async function testElasticsearchHealthCheck() {
  const elasticsearchUrl = process.env.ELASTICSEARCH_URL;
  const timeout = parseInt(process.env.ELASTICSEARCH_HEALTH_TIMEOUT) || 30000;
  
  if (!elasticsearchUrl) {
    console.log('❌ ELASTICSEARCH_URL not configured');
    return false;
  }
  
  console.log(`\nTesting Elasticsearch health check:`);
  console.log(`URL: ${elasticsearchUrl}`);
  console.log(`Timeout: ${timeout}ms`);
  
  try {
    const startTime = Date.now();
    
    // Create client with proper configuration
    const client = new Client({
      node: elasticsearchUrl,
      requestTimeout: timeout,
      pingTimeout: Math.min(timeout, 10000), // Cap ping timeout at 10s
      maxRetries: 1,
      resurrectStrategy: 'ping',
    });
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });
    
    // Test the ping
    console.log('Pinging Elasticsearch...');
    await Promise.race([
      client.ping(),
      timeoutPromise
    ]);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Elasticsearch is healthy (${responseTime}ms)`);
    
    await client.close();
    return true;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Elasticsearch health check failed: ${error.message} (${responseTime}ms)`);
    return false;
  }
}

// Test with different timeout values
async function testWithDifferentTimeouts() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING WITH DIFFERENT TIMEOUTS');
  console.log('='.repeat(60));
  
  const timeouts = [5000, 10000, 15000, 30000];
  
  for (const timeout of timeouts) {
    console.log(`\nTesting with ${timeout}ms timeout:`);
    
    const elasticsearchUrl = process.env.ELASTICSEARCH_URL;
    const startTime = Date.now();
    
    try {
      const client = new Client({
        node: elasticsearchUrl,
        requestTimeout: timeout,
        pingTimeout: Math.min(timeout, 10000),
        maxRetries: 1,
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });
      
      await Promise.race([
        client.ping(),
        timeoutPromise
      ]);
      
      const responseTime = Date.now() - startTime;
      console.log(`  ✅ SUCCESS (${responseTime}ms)`);
      
      await client.close();
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`  ❌ FAILED: ${error.message} (${responseTime}ms)`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ELASTICSEARCH HEALTH CHECK TEST');
  console.log('='.repeat(60));
  
  // Test 1: Basic health check
  const isHealthy = await testElasticsearchHealthCheck();
  
  // Test 2: Different timeouts
  await testWithDifferentTimeouts();
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Basic health check: ${isHealthy ? 'PASSED' : 'FAILED'}`);
  
  if (!isHealthy) {
    console.log('\n🔍 TROUBLESHOOTING TIPS:');
    console.log('1. Check if Elasticsearch is running: curl http://burnick.local:9201');
    console.log('2. Check network connectivity to burnick.local');
    console.log('3. Verify the ELASTICSEARCH_URL in .env file');
    console.log('4. Try increasing ELASTICSEARCH_HEALTH_TIMEOUT');
  }
}

main().catch(console.error);