const { Client } = require('@elastic/elasticsearch');

async function testElasticsearch() {
  console.log('Testing Elasticsearch connection...');
  
  const client = new Client({
    node: 'http://burnick.local:9201',
    requestTimeout: 30000,
    pingTimeout: 10000,
    maxRetries: 3,
  });

  try {
    console.log('Attempting ping...');
    const startTime = Date.now();
    
    const result = await client.ping();
    const endTime = Date.now();
    
    console.log('Ping successful!');
    console.log('Response time:', endTime - startTime, 'ms');
    console.log('Result:', result);
  } catch (error) {
    console.error('Ping failed:', error.message);
    console.error('Error details:', error);
  }

  try {
    console.log('Attempting cluster health check...');
    const health = await client.cluster.health();
    console.log('Cluster health:', health);
  } catch (error) {
    console.error('Cluster health failed:', error.message);
  }
}

testElasticsearch().catch(console.error);