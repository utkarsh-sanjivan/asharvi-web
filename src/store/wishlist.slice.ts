import { PayloadAction } from '@reduxjs/toolkit';

import { coursesApi } from '@/store/api/courses.api';
import { createAppSlice } from '@/store/utils/createAppSlice';
import { resolveRejectedActionError } from '@/store/utils/error';

export type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface WishlistState {
  courseIds: string[];
  pending: Record<string, 'adding' | 'removing'>;
  status: LoadingStatus;
  error: string | null;
}

export const initialState: WishlistState = {
  courseIds: [],
  pending: {},
  status: 'idle',
  error: null,
};

const wishlistSlice = createAppSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<string>) => {
      if (!state.courseIds.includes(action.payload)) {
        state.courseIds.push(action.payload);
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.courseIds = state.courseIds.filter((id) => id !== action.payload);
    },
    clearWishlist: (state) => {
      state.courseIds = [];
      state.pending = {};
    },
    markWishlistPending: (state, action: PayloadAction<{ courseId: string; direction: 'adding' | 'removing' }>) => {
      state.pending[action.payload.courseId] = action.payload.direction;
    },
    clearWishlistPending: (state, action: PayloadAction<string>) => {
      delete state.pending[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(coursesApi.endpoints.toggleWishlist.matchPending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        const courseId = action.meta.arg.originalArgs.courseId;
        state.pending[courseId] = action.meta.arg.originalArgs.action === 'add' ? 'adding' : 'removing';
      })
      .addMatcher(coursesApi.endpoints.toggleWishlist.matchFulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        const courseId = action.meta.arg.originalArgs.courseId;
        delete state.pending[courseId];
      })
      .addMatcher(coursesApi.endpoints.toggleWishlist.matchRejected, (state, action) => {
        state.status = 'failed';
        const courseId = action.meta.arg.originalArgs.courseId;
        delete state.pending[courseId];
        const resolved = resolveRejectedActionError(action, 'Unable to update wishlist');
        state.error = resolved.message;
      })
      .addMatcher(coursesApi.endpoints.list.matchFulfilled, (state, action) => {
        const nextIds = new Set(state.courseIds);
        const courses = action.payload?.data ?? [];

        courses.forEach((course) => {
          const courseId = course?.id ?? course?._id;
          if (!courseId) {
            return;
          }

          if (course?.isWishlisted === true) {
            nextIds.add(courseId);
          } else if (course?.isWishlisted === false) {
            nextIds.delete(courseId);
          }
        });

        state.courseIds = Array.from(nextIds);
      })
      .addMatcher(coursesApi.endpoints.detail.matchFulfilled, (state, action) => {
        const course = action.payload?.data;
        const courseId = course?.id ?? course?._id;

        if (!courseId) {
          return;
        }

        if (course?.isWishlisted === true) {
          if (!state.courseIds.includes(courseId)) {
            state.courseIds.push(courseId);
          }
        } else if (course?.isWishlisted === false) {
          state.courseIds = state.courseIds.filter((id) => id !== courseId);
        }
      })
      .addMatcher(coursesApi.endpoints.wishlist.matchFulfilled, (state, action) => {
        const ids = action.payload?.ids ?? [];
        state.courseIds = ids;
        state.pending = {};
      });
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  markWishlistPending,
  clearWishlistPending,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
