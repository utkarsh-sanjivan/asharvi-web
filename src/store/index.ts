import { configureStore, type DevToolsEnhancerOptions } from '@reduxjs/toolkit';

import { env } from '@/config/env';
import { apiService } from '@/services/api.service';

import { authMiddleware } from './middleware/auth.middleware';
import { createReducerManager } from './reducerManager';
import type { AppStoreWithManager } from './types';
import { createUserReducer, registerUserModule, USER_MODULE_KEY } from './modules/user.module';
import {
  createCoursesReducer,
  registerCoursesModule,
  COURSES_MODULE_KEY,
} from './modules/courses.module';
import {
  createWishlistReducer,
  registerWishlistModule,
  WISHLIST_MODULE_KEY,
} from './modules/wishlist.module';
import {
  createAssessmentReducer,
  registerAssessmentModule,
  ASSESSMENT_MODULE_KEY,
} from './modules/assessment.module';
import {
  createChildrenReducer,
  registerChildrenModule,
  CHILDREN_MODULE_KEY,
} from './modules/children.module';
import {
  createMockReducer,
  registerMockModule,
  MOCK_MODULE_KEY,
} from './modules/mock.module';
import { redactEmail } from './utils/error';

const devToolsActionSanitizer: DevToolsEnhancerOptions['actionSanitizer'] = (action) => {
  const candidate = action as { type: string } & Record<string, unknown>;

  if (
    candidate.type.startsWith('app/apiService/executeQuery') ||
    candidate.type.startsWith('app/apiService/executeMutation')
  ) {
    return { ...candidate, payload: '<<omitted>>' } as unknown as typeof action;
  }

  return action;
};

const devToolsStateSanitizer: DevToolsEnhancerOptions['stateSanitizer'] = (state) => {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const record = state as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...record };

  if (sanitized.user && typeof sanitized.user === 'object') {
    const userState = sanitized.user as Record<string, unknown>;
    sanitized.user = {
      ...userState,
      email: redactEmail(userState.email as string | null | undefined),
    };
  }

  if (sanitized.apiService && typeof sanitized.apiService === 'object') {
    const apiSlice = sanitized.apiService as Record<string, unknown>;
    sanitized.apiService = {
      ...apiSlice,
      queries: env.NODE_ENV === 'production' ? {} : apiSlice.queries,
      mutations: env.NODE_ENV === 'production' ? {} : apiSlice.mutations,
    };
  }

  return sanitized as typeof state;
};

const baseReducers = {
  [apiService.reducerPath]: apiService.reducer,
  [USER_MODULE_KEY]: createUserReducer(),
  [COURSES_MODULE_KEY]: createCoursesReducer(),
  [WISHLIST_MODULE_KEY]: createWishlistReducer(),
};

export const makeStore = (preloadedState?: Record<string, unknown>): AppStoreWithManager => {
  const candidateState = preloadedState as Record<string, unknown> | undefined;
  const initialReducers = { ...baseReducers } as Record<string, any>;

  if (candidateState && ASSESSMENT_MODULE_KEY in candidateState) {
    initialReducers[ASSESSMENT_MODULE_KEY] = createAssessmentReducer();
  }

  if (candidateState && CHILDREN_MODULE_KEY in candidateState) {
    initialReducers[CHILDREN_MODULE_KEY] = createChildrenReducer();
  }

  if (candidateState && MOCK_MODULE_KEY in candidateState && env.NODE_ENV !== 'production') {
    initialReducers[MOCK_MODULE_KEY] = createMockReducer();
  }

  const reducerManager = createReducerManager(initialReducers);
  const devToolsEnabled = env.NODE_ENV !== 'production' || env.REDUX_DEVTOOLS_ENABLED;

  const devToolsConfig: DevToolsEnhancerOptions | boolean = devToolsEnabled
    ? {
        name: 'Asharvi Store',
        trace: env.NODE_ENV !== 'production',
        traceLimit: 25,
        actionSanitizer: devToolsActionSanitizer,
        stateSanitizer: devToolsStateSanitizer,
      }
    : false;

  const store = configureStore({
    reducer: reducerManager.reduce,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(apiService.middleware, authMiddleware) as unknown as ReturnType<typeof getDefaultMiddleware>,
    devTools: devToolsConfig,
  });

  const enhancedStore = store as AppStoreWithManager;
  enhancedStore.reducerManager = reducerManager;

  registerUserModule(enhancedStore);
  registerCoursesModule(enhancedStore);
  registerWishlistModule(enhancedStore);

  if (candidateState && 'assessment' in candidateState) {
    registerAssessmentModule(enhancedStore);
  }

  if (candidateState && 'children' in candidateState) {
    registerChildrenModule(enhancedStore);
  }

  if (candidateState && 'mock' in candidateState && env.NODE_ENV !== 'production') {
    registerMockModule(enhancedStore);
  }

  return enhancedStore;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppPreloadedState = Partial<RootState>;
export type AppDispatch = AppStore['dispatch'];
export type { AppStoreWithManager } from './types';

export const store = makeStore();
