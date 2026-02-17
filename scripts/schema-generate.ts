/**
 * YAML Schema Generation from TypeScript Interfaces
 *
 * This script automatically generates JSON schemas for all game content types
 * using the `typescript-json-schema` library directly from the actual TypeScript
 * interfaces in the codebase. This ensures that schemas stay perfectly in sync
 * with TypeScript type definitions.
 *
 * HOW IT WORKS:
 * 1. Reads TypeScript interfaces directly from `src/app/interfaces/`
 * 2. typescript-json-schema generates JSON schemas from these interfaces
 * 3. Generated schemas provide IDE support and validation for YAML content
 *
 * KEEPING SCHEMAS IN SYNC WITH TYPESCRIPT:
 * - Schemas are automatically generated from actual TypeScript interfaces
 * - Run `npm run schemas:generate` to regenerate schemas after interface changes
 * - Schemas are automatically regenerated during `npm install` (postinstall)
 *
 * BENEFITS:
 * - Real-time validation in VSCode for YAML content files
 * - IntelliSense autocomplete for properties and enum values
 * - Type safety ensures content matches expected TypeScript interfaces
 * - Single source of truth: TypeScript interfaces drive both code and validation
 * - No manual maintenance required - schemas automatically stay in sync
 */

// @ts-nocheck

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */

const TJS = require('typescript-json-schema');
const fs = require('fs-extra');
const path = require('path');

// Ensure the schemas directory exists
const schemasDir = './schemas';
fs.ensureDirSync(schemasDir);

console.log('Generating JSON schemas from TypeScript interfaces...');

// Post-process schema to fix issues with branded types, StatBlocks, and optional properties
function fixSchema(schema: any): any {
  if (!schema) return schema;

  // Recursively process the schema
  function processSchema(obj: any, parentKey?: string): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (parentKey === '__type') {
      return;
    }

    if (Array.isArray(obj)) {
      return obj.map((item: any) => processSchema(item));
    }

    const processed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      let processedValue = processSchema(value as any, key);
      if (!processedValue) continue;

      // Fix branded type IDs - convert complex allOf structures to simple strings for ID fields
      if (key === 'id' || key.includes('Id') || key.endsWith('id')) {
        if (processedValue && typeof processedValue === 'object') {
          if (processedValue.allOf || processedValue.type === 'object') {
            // Convert branded types to simple string type
            processedValue = {
              type: 'string',
              title: key,
            };
          }
        }
      }

      // Fix all ID-related arrays to be arrays of strings (run after processing)
      if (
        key.includes('Id') &&
        key.endsWith('s') &&
        processedValue &&
        processedValue.type === 'array'
      ) {
        processedValue = {
          type: 'array',
          items: { type: 'string' },
          title: key,
          description: `Array of ${key.replace('s', '')} IDs`,
        };
      }

      processed[key] = processedValue;
    }

    return processed;
  }

  const ret = processSchema(schema);

  ret.allOf = ret.allOf.filter(
    (item: any) => !item.required.includes('__type'),
  );

  return ret;
}

// Additional post-processing function to fix complex nested ID arrays
function postProcessIdArrays(schema: any): any {
  if (!schema) return schema;

  function traverse(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(traverse);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      let processedValue = traverse(value);

      // Fix any array with complex allOf items that should be simple strings
      if (
        key.includes('Id') &&
        key.endsWith('s') &&
        processedValue &&
        processedValue.type === 'array' &&
        processedValue.items &&
        processedValue.items.allOf
      ) {
        // Check if it's a branded type pattern (empty object + string)
        const hasString = processedValue.items.allOf.some(
          (item: any) => item.type === 'string',
        );
        const hasEmptyObject = processedValue.items.allOf.some(
          (item: any) =>
            item.type === 'object' &&
            (!item.properties || Object.keys(item.properties).length === 0),
        );

        if (hasString && hasEmptyObject) {
          processedValue = {
            type: 'array',
            items: { type: 'string' },
            title: key,
            description: `Array of ${key.replace('s', '')} IDs`,
          };
        }
      }

      result[key] = processedValue;
    }

    return result;
  }

  return traverse(schema);
}

// Settings for typescript-json-schema
const settings = {
  required: true,
  strictNullChecks: false, // Disabled to handle complex types
  esModuleInterop: true,
  skipLibCheck: true,
  noImplicitAny: false, // Disabled to handle complex types
  additionalProperties: false,
  titles: true,
  descriptions: true,
  ref: false,
  aliasRef: false,
  topRef: false,
  defaultProps: false,
  ignoreErrors: true, // Ignore TypeScript errors during schema generation
  excludePrivate: true,
  rejectDateType: false,
};

// Create a program from the actual interface files
// Dynamically load all files in `src/app/interfaces/` that start with `content-`
const interfacesDir = path.resolve(__dirname, '../src/app/interfaces');
let interfaceFiles: string[] = [];
try {
  interfaceFiles = fs
    .readdirSync(interfacesDir)
    .filter((f) => f.startsWith('content-') && f.endsWith('.ts'))
    .sort()
    .map((f) => path.join(interfacesDir, f));
} catch (err) {
  console.error('Error reading interfaces directory:', err?.message || err);
}

if (interfaceFiles.length === 0) {
  console.warn('No content-*.ts interface files found in', interfacesDir);
}

const program = TJS.getProgramFromFiles(interfaceFiles, {
  strictNullChecks: false, // Disabled to handle complex types
  esModuleInterop: true,
  skipLibCheck: true,
  noImplicitAny: false, // Disabled to handle complex types
  resolveJsonModule: true,
  moduleResolution: 1, // NodeJs
  target: 99, // ESNext
  allowSyntheticDefaultImports: true,
  baseUrl: path.resolve(__dirname, '../'),
  paths: {
    '@interfaces/*': ['src/app/interfaces/*'],
    '@interfaces': ['src/app/interfaces/index.ts'],
    '@helpers/*': ['src/app/helpers/*'],
    '@helpers': ['src/app/helpers/index.ts'],
  },
});

// Dynamically build content type mappings to actual TypeScript interface names
// by scanning discovered `content-*.ts` interface files and extracting the
// exported type/interface name that ends with `Content`.
const contentTypeMap: Record<string, string> = {};
for (const filePath of interfaceFiles) {
  const base = path.basename(filePath);
  const key = base.replace(/^content-/, '').replace(/\.ts$/, '');
  let typeName: string | undefined;

  try {
    const fileText = fs.readFileSync(filePath, 'utf8');

    // Try to find `export interface XContent` or `export type XContent` patterns
    const m = fileText.match(
      /export\s+(?:type|interface)\s+([A-Za-z0-9_]+Content)\b/,
    );
    if (m) {
      typeName = m[1];
    } else {
      // Try to find named exports: `export { XContent, ... }`
      const m2 = fileText.match(
        /export\s*\{[^}]*([A-Za-z0-9_]+Content)[^}]*\}/,
      );
      if (m2) typeName = m2[1];
    }
  } catch (err) {
    console.warn(
      'Could not read interface file',
      filePath,
      err?.message || err,
    );
  }

  if (!typeName) {
    // Fallback: derive a PascalCase type name from the filename, append `Content`
    const pascal = key
      .split(/[-_]/)
      .map((s) => (s.length ? s[0].toUpperCase() + s.slice(1) : ''))
      .join('');
    typeName = `${pascal}Content`;
    console.warn(
      `Could not detect exported Content type in ${base}, falling back to ${typeName}`,
    );
  }

  contentTypeMap[key] = typeName;
}

// Generate schemas for other content types
for (const [contentType, typeName] of Object.entries(contentTypeMap)) {
  try {
    console.log(
      `Generating schema for ${contentType} from TypeScript type ${typeName}...`,
    );

    let schema = TJS.generateSchema(program, typeName, settings);

    if (!schema) {
      console.warn(
        `Could not generate schema for ${contentType} (${typeName})`,
      );
      continue;
    }

    // Fix schema issues
    schema = postProcessIdArrays(fixSchema(schema));

    // For single content items, wrap in array for YAML content files
    const arraySchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content schema`,
      description: `JSON schema for ${contentType} YAML content files, automatically generated from TypeScript interfaces`,
      type: 'array',
      items: schema,
    };

    const schemaPath = path.join(schemasDir, `${contentType}.schema.json`);
    // Remove internal-only __type properties before writing schema files
    fs.writeJsonSync(schemaPath, arraySchema, { spaces: 2 });
    console.log(`✓ Generated schema: ${schemaPath}`);
  } catch (error: any) {
    console.error(
      `Error generating schema for ${contentType}:`,
      error?.message || 'Unknown error',
    );
    console.error(error.stack);
  }
}

console.log('TypeScript-based schema generation complete!');

// Update .vscode/settings.json yaml.schemas to map generated schemas to gamedata folders
try {
  const settingsPath = path.resolve('.vscode', 'settings.json');
  let settings: any = {};
  try {
    const text = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(text);
  } catch (err) {
    settings = {};
  }

  const yamlSchemas: Record<string, string | string[]> = {};
  for (const contentType of Object.keys(contentTypeMap)) {
    const schemaPath = `./schemas/${contentType}.schema.json`;
    if (contentType === 'equipment') {
      yamlSchemas[schemaPath] = [
        'gamedata/armor/*.yml',
        'gamedata/accessory/*.yml',
        'gamedata/trinket/*.yml',
        'gamedata/weapon/*.yml',
      ];
    } else {
      yamlSchemas[schemaPath] = `gamedata/${contentType}/*.yml`;
    }
  }

  settings['yaml.schemas'] = yamlSchemas;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  console.log('Updated', settingsPath, 'yaml.schemas with generated schemas');
} catch (err) {
  console.warn('Failed to update .vscode/settings.json:', err?.message || err);
}
