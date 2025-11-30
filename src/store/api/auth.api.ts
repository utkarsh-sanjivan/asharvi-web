import { env } from '@/config/env';
import { apiService } from '@/services/api.service';
import { setUser, clearUser } from '@/store/user.slice';
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ProfileResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types/api/auth';

const normalizeUser = (payload: any): AuthUser => ({
  id: payload?.id ?? payload?._id ?? '',
  name: payload?.name ?? payload?.fullName ?? '',
  email: payload?.email ?? '',
  role: payload?.role ?? 'user',
  createdAt: payload?.createdAt,
  updatedAt: payload?.updatedAt,
});

export const authApi = apiService.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
      transformResponse: (response: any): LoginResponse => ({
        success: Boolean(response?.success ?? true),
        message: response?.message,
        user: normalizeUser(response?.user ?? response?.data?.user ?? {}),
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              setUser({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                createdAt: data.user.createdAt ?? null,
                updatedAt: data.user.updatedAt ?? null,
              })
            );
          }
        } catch {
          // ignore; errors handled by baseQuery/extraReducers
        }
      },
    }),
    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
      transformResponse: (response: any): LogoutResponse => ({
        success: Boolean(response?.success ?? true),
        message: response?.message,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearUser());
        }
      },
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (payload) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any): RegisterResponse => ({
        success: Boolean(response?.success ?? response?.data?.success ?? true),
        message: response?.message,
        user: normalizeUser(response?.data?.user ?? response?.user ?? payloadFallback(response)),
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              setUser({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                createdAt: data.user.createdAt ?? null,
                updatedAt: data.user.updatedAt ?? null,
              })
            );
          }
        } catch {
          // ignore; handled elsewhere
        }
      },
    }),
    profile: builder.query<ProfileResponse, void>({
      query: () => ({
        url: '/api/auth/me',
        method: 'GET',
      }),
      providesTags: ['Auth'],
      transformResponse: (response: any): ProfileResponse => ({
        user: normalizeUser(response?.user ?? response?.data?.user ?? {}),
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              setUser({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                createdAt: data.user.createdAt ?? null,
                updatedAt: data.user.updatedAt ?? null,
              })
            );
          }
        } catch (error: any) {
          const status = error?.error?.status;
          if (status === 401) {
            dispatch(clearUser());
          }
        }
      },
    }),
    refresh: builder.mutation<RefreshResponse, void>({
      query: () => ({
        url: '/api/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
      transformResponse: (response: any): RefreshResponse => ({
        success: Boolean(response?.success ?? true),
        user: response?.user ? normalizeUser(response.user) : undefined,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              setUser({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                createdAt: data.user.createdAt ?? null,
                updatedAt: data.user.updatedAt ?? null,
              })
            );
          }
        } catch (error: any) {
          const status = error?.error?.status;
          if (status === 401) {
            dispatch(clearUser());
          }
        }
      },
    }),
  }),
  overrideExisting: true,
});

function payloadFallback(response: any): AuthUser {
  const source = response?.data ?? response ?? {};
  return normalizeUser({
    id: source?.id,
    name: source?.name,
    email: source?.email,
    role: source?.role,
    createdAt: source?.createdAt,
    updatedAt: source?.updatedAt,
  });
}

export const {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useProfileQuery,
  useRefreshMutation,
  useLazyProfileQuery,
} = authApi;
