const { generateOpenApiDocument } = require('trpc-openapi');
const { z } = require('zod');

// Simple test to see if trpc-openapi works
console.log('Testing trpc-openapi...');

try {
  // Create a simple router structure
  const testRouter = {
    _def: {
      record: {
        test: {
          _def: {
            type: 'query',
            meta: {
              openapi: {
                method: 'GET',
                path: '/test',
                summary: 'Test endpoint'
              }
            }
          }
        }
      }
    }
  };

  const doc = generateOpenApiDocument(testRouter, {
    title: 'Test API',
    version: '1.0.0',
    baseUrl: 'http://localhost:3000'
  });

  console.log('OpenAPI generation successful!');
  console.log('Paths:', Object.keys(doc.paths || {}));
} catch (error) {
  console.error('OpenAPI generation failed:', error.message);
}