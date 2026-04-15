import * as Joi from '@hapi/joi';
import 'joi-extract-type';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'provision').default('development'),
  PORT: Joi.number().port().default(3000),
  GITHUB_API_URL: Joi.string().uri().default('https://api.github.com'),
  GITHUB_API_VERSION: Joi.date().default('2026-03-10'),
});

export type ConfigSchemaType = Joi.extractType<typeof validationSchema>;
