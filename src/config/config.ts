import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'provision').default('development'),
  PORT: Joi.number().port().default(3000),
  GITHUB_API_URL: Joi.string().uri().default('https://api.github.com'),
  GITHUB_API_VERSION: Joi.date().options({ dateFormat: 'date' }).default('2026-03-10'),
});
