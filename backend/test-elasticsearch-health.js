#!/usr/bin/env node

// Simple test script to verify Elasticsearch health check
const { Client } = require('@elastic/elasticsearch');

async function testElasticsearchHealth() {
  console.log('Testing Elasticsearch health check...');
  
  const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://burnick.local:9201';
  const timeout = 15000;
  
  console.log(`Elasticsearch URL: ${elasticsearchUrl}`);
  console.log(`Timeout: ${timeout}ms`);
  
  try {
    // Test 1: Simple HTTP request to cluster health endpoint
    console.log('\n1. Testing simple HTTP request to /_cluster/health...');
    const startTime1 = Date.now();
    
    const response = await fetch(`${elasticsearchUrl}/_cluster/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeout)
    });
    
    const responseTime1 = Date.now() - startTime1;
    console.log(`HTTP request result: ${response.ok ? 'SUCCESS' : 'FAILED'} (${responseTime1}ms)`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Cluster status: ${data.status}`);
    }
    
  } catch (error) {
    console.log(`HTTP request failed: ${error.message}`);
  }
  
  try {
    // Test 2: Elasticsearch client ping
    console.log('\n2. Testing Elasticsearch client ping...');
    const startTime2 = Date.now();
    
    const client = new Client({
      node: elasticsearchUrl,
      requestTimeout: timeout,
      pingTimeout: timeout,
      maxRetries: 1,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Client ping timeout')), timeout);
    });
    
    await Promise.race([
      client.ping(),
      timeoutPromise
    ]);
    
    const responseTime2 = Date.now() - startTime2;
    console.log(`Client ping result: SUCCESS (${responseTime2}ms)`);
    
    await client.close();
    
  } catch (error) {
    console.log(`Client ping failed: ${error.message}`);
  }
  
  try {
    // Test 3: Test connection with very short timeout
    console.log('\n3. Testing with short timeout (5s)...');
    const shortTimeout = 5000;
    const startTime3 = Date.now();
    
    const client = new Client({
      node: elasticsearchUrl,
      requestTimeout: shortTimeout,
      pingTimeout: shortTimeout,
      maxRetries: 1,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Short timeout')), shortTimeout);
    });
    
    await Promise.race([
      client.ping(),
      timeoutPromise
    ]);
    
    const responseTime3 = Date.now() - startTime3;
    console.log(`Short timeout test result: SUCCESS (${responseTime3}ms)`);
    
    await client.close();
    
  } catch (error) {
    const responseTime3 = Date.now() - startTime3;
    console.log(`Short timeout test failed: ${error.message} (${responseTime3}ms)`);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('fetch is not available, skipping HTTP test');
  global.fetch = require('node-fetch');
}

testElasticsearchHealth().catch(console.error);