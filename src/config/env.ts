interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
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
  NEXT_PUBLIC_API_BASE: {
    default: 'http://localhost:8000/api/v1',
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

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? (process.env as RuntimeEnv)
    : {};

function normalizeString(value: string | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseInteger(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositiveInteger(value: string | undefined) {
  const parsed = parseInteger(value);
  return typeof parsed === 'number' && parsed > 0 ? parsed : undefined;
}

function parseBoolean(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(lower)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(lower)) {
    return false;
  }

  return undefined;
}

const rawEnv = {
  NODE_ENV: normalizeString(runtimeEnv.NODE_ENV) as EnvConfig['NODE_ENV'] | undefined,
  NEXT_PUBLIC_API_BASE: normalizeString(runtimeEnv.NEXT_PUBLIC_API_BASE),
  NEXT_PUBLIC_SITE_URL: normalizeString(runtimeEnv.NEXT_PUBLIC_SITE_URL),
  API_RATE_LIMIT_MAX: parsePositiveInteger(runtimeEnv.API_RATE_LIMIT_MAX),
  API_RATE_LIMIT_WINDOW_MS: parsePositiveInteger(runtimeEnv.API_RATE_LIMIT_WINDOW_MS),
  CSRF_COOKIE_NAME: normalizeString(runtimeEnv.CSRF_COOKIE_NAME),
  AUTH_SESSION_COOKIE_NAME: normalizeString(runtimeEnv.AUTH_SESSION_COOKIE_NAME),
  REDUX_DEVTOOLS_ENABLED: parseBoolean(runtimeEnv.REDUX_DEVTOOLS_ENABLED),
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
