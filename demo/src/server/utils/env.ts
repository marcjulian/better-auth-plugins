import * as z from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('production'),

  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error(env.error.issues);
  throw new Error('There is an error with the api environment variables');
}

export default (env.success ? env.data : process.env) as z.infer<typeof envSchema>;
