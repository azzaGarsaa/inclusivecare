import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './bootstrap.js';

// Writes the OpenAPI description to disk without starting the HTTP server.
// The web app generates its API types from this file.
const output = process.argv[2] ?? 'openapi.json';

const app = await NestFactory.create(AppModule, { logger: ['error'] });
configureApp(app);
writeFileSync(output, JSON.stringify(buildOpenApiDocument(app), null, 2) + '\n');
await app.close();
console.log(`OpenAPI document written to ${output}`);
