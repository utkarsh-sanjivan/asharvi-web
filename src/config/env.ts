interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  APP_ENV: 'development' | 'staging' | 'production';
  NEXT_PUBLIC_APP_ENV: 'development' | 'staging' | 'production';
  NEXT_PUBLIC_API_BASE: string;
  NEXT_PUBLIC_SITE_URL: string;
  API_RATE_LIMIT_MAX: number;
  API_RATE_LIMIT_WINDOW_MS: number;
  CSRF_COOKIE_NAME: string;
  AUTH_SESSION_COOKIE_NAME: string;
  REDUX_DEVTOOLS_ENABLED: boolean;
}

type EnvSchema = {
  [K in keyof EnvConfig]: {
    default: EnvConfig[K];
    validate: (value: unknown) => value is EnvConfig[K];
    errorMessage: string;
  };
};

const schema: EnvSchema = {
  NODE_ENV: {
    default: 'development',
    validate: (value: unknown): value is EnvConfig['NODE_ENV'] =>
      value === 'development' || value === 'production' || value === 'test',
    errorMessage: 'NODE_ENV must be one of development, production, or test.',
  },
  APP_ENV: {
    default: 'development',
    validate: (value: unknown): value is EnvConfig['APP_ENV'] =>
      value === 'development' || value === 'staging' || value === 'production',
    errorMessage: 'APP_ENV must be one of development, staging, or production.',
  },
  NEXT_PUBLIC_APP_ENV: {
    default: 'development',
    validate: (value: unknown): value is EnvConfig['NEXT_PUBLIC_APP_ENV'] =>
      value === 'development' || value === 'staging' || value === 'production',
    errorMessage: 'NEXT_PUBLIC_APP_ENV must be one of development, staging, or production.',
  },
  NEXT_PUBLIC_API_BASE: {
    default: 'http://localhost:8080/api/v1',
    validate: (value: unknown): value is string => typeof value === 'string' && value.length > 0,
    errorMessage: 'NEXT_PUBLIC_API_BASE must be a non-empty string.',
  },
  NEXT_PUBLIC_SITE_URL: {
    default: 'http://localhost:3000',
    validate: (value: unknown): value is string => typeof value === 'string' && value.length > 0,
    errorMessage: 'NEXT_PUBLIC_SITE_URL must be a non-empty string URL.',
  },
  API_RATE_LIMIT_MAX: {
    default: 100,
    validate: (value: unknown): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value > 0,
    errorMessage: 'API_RATE_LIMIT_MAX must be a positive integer.',
  },
  API_RATE_LIMIT_WINDOW_MS: {
    default: 60_000,
    validate: (value: unknown): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value > 0,
    errorMessage: 'API_RATE_LIMIT_WINDOW_MS must be a positive integer.',
  },
  CSRF_COOKIE_NAME: {
    default: 'csrfToken',
    validate: (value: unknown): value is string => typeof value === 'string' && value.length > 0,
    errorMessage: 'CSRF_COOKIE_NAME must be a non-empty string.',
  },
  AUTH_SESSION_COOKIE_NAME: {
    default: 'auth_session',
    validate: (value: unknown): value is string => typeof value === 'string' && value.length > 0,
    errorMessage: 'AUTH_SESSION_COOKIE_NAME must be a non-empty string.',
  },
  REDUX_DEVTOOLS_ENABLED: {
    default: false,
    validate: (value: unknown): value is boolean => typeof value === 'boolean',
    errorMessage: 'REDUX_DEVTOOLS_ENABLED must be a boolean value.',
  },
};

function normalizeString(value: string | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const normalizedNodeEnv = normalizeString(process.env.NODE_ENV) as EnvConfig['NODE_ENV'] | undefined;
const normalizedAppEnv = normalizeString(process.env.APP_ENV) as EnvConfig['APP_ENV'] | undefined;
const normalizedPublicAppEnv = normalizeString(process.env.NEXT_PUBLIC_APP_ENV) as EnvConfig['NEXT_PUBLIC_APP_ENV'] | undefined;
const normalizedApiBase = normalizeString(process.env.NEXT_PUBLIC_API_BASE);
const normalizedSiteUrl = normalizeString(process.env.NEXT_PUBLIC_SITE_URL);
const normalizedRateLimitMax = normalizeString(process.env.API_RATE_LIMIT_MAX);
const normalizedRateLimitWindow = normalizeString(process.env.API_RATE_LIMIT_WINDOW_MS);
const normalizedCsrfCookieName = normalizeString(process.env.CSRF_COOKIE_NAME);
const normalizedAuthCookieName = normalizeString(process.env.AUTH_SESSION_COOKIE_NAME);
const normalizedDevtoolsEnabled = normalizeString(process.env.REDUX_DEVTOOLS_ENABLED);

const rawEnv = {
  NODE_ENV: normalizedNodeEnv,
  APP_ENV: normalizedAppEnv,
  NEXT_PUBLIC_APP_ENV: normalizedPublicAppEnv ?? normalizedAppEnv,
  NEXT_PUBLIC_API_BASE: normalizedApiBase,
  NEXT_PUBLIC_SITE_URL: normalizedSiteUrl,
  API_RATE_LIMIT_MAX: normalizedRateLimitMax ? Number(normalizedRateLimitMax) : undefined,
  API_RATE_LIMIT_WINDOW_MS: normalizedRateLimitWindow ? Number(normalizedRateLimitWindow) : undefined,
  CSRF_COOKIE_NAME: normalizedCsrfCookieName,
  AUTH_SESSION_COOKIE_NAME: normalizedAuthCookieName,
  REDUX_DEVTOOLS_ENABLED: normalizedDevtoolsEnabled
    ? normalizedDevtoolsEnabled === 'true'
    : undefined,
};

function validateEnv(): EnvConfig {
  const output: Partial<EnvConfig> = {};
  const errors: string[] = [];

  (Object.keys(schema) as Array<keyof EnvSchema>).forEach((key) => {
    const definition = schema[key];
    const value = rawEnv[key as keyof typeof rawEnv];
    const finalValue = value ?? definition.default;

    if (definition.validate(finalValue)) {
      (output as any)[key] = finalValue;
    } else {
      errors.push(definition.errorMessage);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return output as EnvConfig;
}

export const env = validateEnv();
