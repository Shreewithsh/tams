import { z, ZodSchema } from 'zod';

/**
 * Validates process.env against a Zod schema.
 * Exits the process immediately on validation failure,
 * since missing/invalid env vars make the service non-functional.
 */
export function validateEnv<T>(schema: z.ZodType<T, any, any>): T {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`[Config] Environment validation failed:\n${issues}`);
    process.exit(1);
  }

  return result.data;
}

/**
 * Re-export Zod for convenience so consumers don't need a separate import.
 */
export { z };
