import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const apiRoot = path.resolve(__dirname, '../../app/api');

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

function getExportedMethods(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const methods: string[] = [];
  for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
    if (content.match(new RegExp(`export\\s+async\\s+function\\s+${method}\\b`))) {
      methods.push(method);
    }
  }
  return methods;
}

function routePathFromFile(filePath: string): string {
  const relative = path.relative(apiRoot, path.dirname(filePath));
  const segments = relative.split(path.sep).map((s) =>
    s.startsWith('[') ? `:${s.slice(1, -1)}` : s,
  );
  return `/api/${segments.join('/')}`;
}

const EXPECTED_ROUTES: Record<string, string[]> = {
  '/api/health': ['GET'],
  '/api/colors': ['GET'],
  '/api/sessions': ['GET', 'POST'],
  '/api/sessions/:id': ['GET', 'PATCH'],
  '/api/sessions/:id/generations/:genId': ['PATCH'],
  '/api/sessions/:id/generations/:genId/retry': ['POST'],
  '/api/generate': ['POST'],
  '/api/upload': ['POST'],
  '/api/proxy-image': ['POST'],
  '/api/catalog': ['GET', 'POST'],
  '/api/catalog/:id': ['PATCH', 'DELETE'],
};

describe('API route inventory', () => {
  const routeFiles = findRouteFiles(apiRoot);
  const actualRoutes: Record<string, string[]> = {};

  for (const file of routeFiles) {
    const routePath = routePathFromFile(file);
    actualRoutes[routePath] = getExportedMethods(file);
  }

  it('all expected routes exist', () => {
    for (const [routePath, methods] of Object.entries(EXPECTED_ROUTES)) {
      expect(actualRoutes[routePath]).toBeDefined();
      for (const method of methods) {
        expect(actualRoutes[routePath]).toContain(method);
      }
    }
  });

  it('no unexpected routes exist', () => {
    for (const routePath of Object.keys(actualRoutes)) {
      expect(EXPECTED_ROUTES[routePath]).toBeDefined();
    }
  });

  it('every route has at least one HTTP method', () => {
    for (const [routePath, methods] of Object.entries(actualRoutes)) {
      expect(methods.length).toBeGreaterThan(0);
    }
  });

  it('route count matches expected', () => {
    expect(Object.keys(actualRoutes).length).toBe(Object.keys(EXPECTED_ROUTES).length);
  });
});
