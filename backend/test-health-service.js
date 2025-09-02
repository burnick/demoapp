#!/usr/bin/env node

// Test the health service directly
require('dotenv').config();

// Mock the logger to avoid issues
const logger = {
  info: console.log,
  error: console.error,
  debug: console.log,
  warn: console.warn,
};

// Mock the config
const config = {
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  ELASTICSEARCH_HEALTH_TIMEOUT: parseInt(process.env.ELASTICSEARCH_HEALTH_TIMEOUT) || 15000,
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
};

console.log('Testing health service with config:', {
  HEALTH_CHECK_TIMEOUT: config.HEALTH_CHECK_TIMEOUT,
  ELASTICSEARCH_HEALTH_TIMEOUT: config.ELASTICSEARCH_HEALTH_TIMEOUT,
  ELASTICSEARCH_URL: config.ELASTICSEARCH_URL,
});

// Simple test of the search service health check
async function testSearchServiceHealth() {
  console.log('\nTesting search service health check...');
  
  try {
    // Import the search service
    const { searchService } = require('./src/services/searchService');
    
    const startTime = Date.now();
    const timeout = config.ELASTICSEARCH_HEALTH_TIMEOUT;
    
    console.log(`Calling searchService.isHealthy(${timeout})...`);
    const isHealthy = await searchService.isHealthy(timeout);
    const responseTime = Date.now() - startTime;
    
    console.log(`Search service health result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
    
    return isHealthy;
  } catch (error) {
    console.error('Search service health check failed:', error.message);
    return false;
  }
}

// Test the full health service
async function testHealthService() {
  console.log('\nTesting full health service...');
  
  try {
    // Import the health service
    const { healthService } = require('./src/services/healthService');
    
    const startTime = Date.now();
    console.log('Calling healthService.getDetailedHealth()...');
    const health = await healthService.getDetailedHealth();
    const responseTime = Date.now() - startTime;
    
    console.log(`Health service result (${responseTime}ms):`, JSON.stringify(health, null, 2));
    
    return health;
  } catch (error) {
    console.error('Health service failed:', error.message);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('HEALTH SERVICE TESTS');
  console.log('='.repeat(50));
  
  // Test 1: Search service health
  const searchHealthy = await testSearchServiceHealth();
  
  // Test 2: Full health service
  const fullHealth = await testHealthService();
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Search service: ${searchHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`Full health service: ${fullHealth ? 'SUCCESS' : 'FAILED'}`);
  
  if (fullHealth) {
    console.log(`Overall status: ${fullHealth.status}`);
    console.log(`Search dependency: ${fullHealth.dependencies?.search?.status || 'unknown'}`);
  }
}

runTests().catch(console.error);