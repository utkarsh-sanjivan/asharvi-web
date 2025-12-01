'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import PublicNavbar from '@/components/organisms/PublicNavbar';
import Footer from '@/components/organisms/Footer';
import SpinnerIcon from '@/components/icons/SpinnerIcon';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useFeatureModules } from '@/hooks/useFeatureModule';
import { useAppSelector } from '@/hooks/useAppSelector';
import type { FeatureModuleKey } from '@/store/modules/registry';
import { coursesApi, useCourseDetailQuery } from '@/store/api/courses.api';
import { selectUserProfile } from '@/store/selectors/user.selectors';
import { selectMockCourses } from '@/store/selectors/mock.selectors';
import type { PDFMetadata, Course, Section } from '@/types';

import './index.css';
import LearningPlayerSection from '@/components/organisms/LearningPlayerSection';
import LearningNotesPanel from '@/components/organisms/LearningNotesPanel';
import LearningCourseDetailsPanel from '@/components/organisms/LearningCourseDetailsPanel';
import LearningCurriculumPanel from '@/components/organisms/LearningCurriculumPanel';
import type { LectureItem } from '@/components/organisms/LearningShared/types';

const PROGRESS_THRESHOLD = 0.9;
const FALLBACK_VIDEO = 'https://storage.googleapis.com/ashravi-assets/videos/positive-parenting-preview.mp4';

const resolveMediaUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string') {
    return undefined;
  }

  if (url.startsWith('http')) {
    return url;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? '';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatDurationLabel = (seconds?: number): string | undefined => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

const flattenCourseLectures = (course: Course | undefined): LectureItem[] => {
  if (!course || !Array.isArray(course.sections)) {
    return [];
  }

  const lectures: LectureItem[] = [];

  (course.sections as Section[]).forEach((section) => {
    if (!section) {
      return;
    }

    section.videos?.forEach((video) => {
      lectures.push({
        id: video._id ?? `${section._id}-video-${video.order}`,
        title: video.title ?? 'Video lesson',
        description: video.description,
        durationLabel: formatDurationLabel(video.duration),
        type: 'video',
        isLocked: Boolean(section.isLocked),
        sectionId: section._id,
        sectionTitle: section.title ?? 'Section',
        video,
        resources: section.pdfs ?? [],
      });
    });

    if (section.test) {
      lectures.push({
        id: section.test._id ?? `${section._id}-quiz`,
        title: section.test.title ?? 'Quiz',
        description: section.test.description,
        durationLabel: section.test.duration ? `${section.test.duration}m` : undefined,
        type: 'quiz',
        isLocked: Boolean(section.isLocked),
        sectionId: section._id,
        sectionTitle: section.title ?? 'Section',
        resources: section.pdfs ?? [],
      });
    }

    section.pdfs?.forEach((resource) => {
      lectures.push({
        id: resource._id ?? `${section._id}-resource-${resource.filename}`,
        title: resource.filename ?? 'Resource',
        description: `${Math.round((resource.size ?? 0) / 1024)} KB`,
        type: 'resource',
        isLocked: Boolean(section.isLocked),
        sectionId: section._id,
        sectionTitle: section.title ?? 'Section',
        resources: [resource],
      });
    });
  });

  return lectures;
};

interface NoteEntry {
  id: string;
  timestamp: number;
  text: string;
  lectureId: string;
}

export default function LearningPage({ courseId }: { courseId: string }) {
  const { isAuthenticated, isChecking } = useAuthGuard({ redirectTo: '/auth/login' });

  const featureKeys = useMemo<FeatureModuleKey[]>(
    () => (process.env.NODE_ENV !== 'production' ? ['courses', 'wishlist', 'mock'] : ['courses', 'wishlist']),
    []
  );
  const featuresReady = useFeatureModules(featureKeys);

  const cachedCourse = coursesApi.endpoints.detail.useQueryState(courseId);
  const mockCourses = useAppSelector(selectMockCourses);
  const shouldFetch = !cachedCourse.data;
  const { isFetching: isFetchingFallback } = useCourseDetailQuery(courseId, {
    skip: !isAuthenticated || !shouldFetch,
  });

  const normalizedCourseId = courseId.trim().toLowerCase();
  const fallbackCourse = mockCourses.find((mock: Course) => {
    const candidates = [mock.id, mock.slug];
    return candidates.some((candidate) => candidate?.toLowerCase() === normalizedCourseId);
  });

  const course = cachedCourse.data?.data ?? fallbackCourse;
  const userProfile = useAppSelector(selectUserProfile);

  const lectures = useMemo(() => flattenCourseLectures(course), [course]);
  const initialLecture = useMemo(
    () => lectures.find((lecture) => lecture.type === 'video' && !lecture.isLocked) ?? lectures[0],
    [lectures]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLectureId, setActiveLectureId] = useState<string | undefined>(initialLecture?.id);
  const [completedLectures, setCompletedLectures] = useState<Set<string>>(new Set());
  const [markingLectureId, setMarkingLectureId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressPostedRef = useRef<Set<string>>(new Set());
  const initializedFromUrlRef = useRef(false);

  useEffect(() => {
    if (initializedFromUrlRef.current || typeof window === 'undefined' || lectures.length === 0) {
      return;
    }

    const url = new URL(window.location.href);
    const candidateFromSearch = url.searchParams.get('lectureId');
    const candidateFromHash = url.hash.startsWith('#lecture-') ? url.hash.slice('#lecture-'.length) : null;
    const candidate = [candidateFromSearch, candidateFromHash].find(
      (value): value is string => Boolean(value && lectures.some((lecture) => lecture.id === value))
    );

    if (candidate) {
      setActiveLectureId(candidate);
      progressPostedRef.current.delete(candidate);
    } else if (!activeLectureId && initialLecture) {
      setActiveLectureId(initialLecture.id);
    }

    initializedFromUrlRef.current = true;
  }, [activeLectureId, initialLecture, lectures]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!videoRef.current) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          event.preventDefault();
          if (videoRef.current.paused) {
            void videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
          break;
        case 'arrowright':
          videoRef.current.currentTime += 5;
          break;
        case 'arrowleft':
          videoRef.current.currentTime -= 5;
          break;
        case 'f':
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            void videoRef.current.requestFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const activeLecture = useMemo(
    () => lectures.find((lecture) => lecture.id === activeLectureId) ?? initialLecture,
    [activeLectureId, lectures, initialLecture]
  );

  const filteredLectures = useMemo(() => {
    if (!searchQuery.trim()) {
      return lectures;
    }

    const normalized = searchQuery.trim().toLowerCase();
    return lectures.filter(
      (lecture) =>
        lecture.title.toLowerCase().includes(normalized) ||
        lecture.sectionTitle.toLowerCase().includes(normalized)
    );
  }, [lectures, searchQuery]);

  const completionRatio = useMemo(() => {
    if (lectures.length === 0) {
      return 0;
    }
    return completedLectures.size / lectures.length;
  }, [completedLectures.size, lectures.length]);

  const handleLectureSelect = (lectureId: string) => {
    if (activeLectureId === lectureId) {
      return;
    }

    setActiveLectureId(lectureId);
    progressPostedRef.current.delete(lectureId);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeLecture || activeLecture.type !== 'video') {
      return;
    }

    const videoElement = videoRef.current;
    if (videoElement.duration && videoElement.currentTime / videoElement.duration >= PROGRESS_THRESHOLD) {
      if (!progressPostedRef.current.has(activeLecture.id)) {
        progressPostedRef.current.add(activeLecture.id);
        void markLectureComplete(activeLecture.id);
      }
    }
  };

  const markLectureComplete = useCallback(
    async (lectureId: string) => {
      if (!isAuthenticated || !userProfile?.id) {
        return;
      }

      setMarkingLectureId(lectureId);
      try {
        await fetch('/api/progress', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userProfile.id,
            courseId,
            lectureId,
            completedAt: new Date().toISOString(),
          }),
        });

        setCompletedLectures((prev) => new Set(prev).add(lectureId));
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[LearningPage] Failed to update progress', error);
        }
      } finally {
        setMarkingLectureId(null);
      }
    },
    [courseId, isAuthenticated, userProfile?.id]
  );

  const handleAddNote = () => {
    if (!noteDraft.trim() || !activeLecture) {
      return;
    }

    const timestamp = videoRef.current?.currentTime ?? 0;
    setNotes((prev) => [
      ...prev,
      {
        id: `${activeLecture.id}-${Date.now()}`,
        timestamp,
        text: noteDraft.trim(),
        lectureId: activeLecture.id,
      },
    ]);
    setNoteDraft('');
  };

  const handleSeekToNote = (timestamp: number) => {
    if (!videoRef.current) {
      return;
    }
    videoRef.current.currentTime = timestamp;
    videoRef.current.focus();
  };

  const currentNotes = notes.filter((note) => note.lectureId === activeLecture?.id);
  const currentSection =
    course && Array.isArray(course.sections)
      ? (course.sections as Section[]).find((section) => section._id === activeLecture?.sectionId)
      : undefined;
  const resources: PDFMetadata[] = (activeLecture?.resources ?? []).filter((resource) => resource.url);
  const resolvedVideoUrl = resolveMediaUrl(activeLecture?.video?.videoUrl) ?? resolveMediaUrl(activeLecture?.video?.thumbnail) ?? FALLBACK_VIDEO;
  const isVideoLecture = activeLecture?.type === 'video' || Boolean(activeLecture?.video);

  const activeLectureIndex = lectures.findIndex((lecture) => lecture.id === activeLecture?.id);
  const previousLecture = activeLectureIndex > 0 ? lectures[activeLectureIndex - 1] : undefined;
  const nextLecture =
    activeLectureIndex >= 0 && activeLectureIndex < lectures.length - 1
      ? lectures[activeLectureIndex + 1]
      : undefined;

  const isLoadingState = isChecking || !featuresReady || (!course && isFetchingFallback);

  if (isLoadingState) {
    return (
      <div className="learning-page">
        <PublicNavbar />
        <main className="learning-main">
          <div className="learning-loading">
            <SpinnerIcon size={48} />
            <p>Preparing your learning experience...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course || lectures.length === 0 || !activeLecture) {
    return (
      <div className="learning-page">
        <PublicNavbar />
        <main className="learning-main">
          <div className="learning-error">
            <h1>Unable to open course</h1>
            <p>We could not load the course content right now. Please return to the course page.</p>
            <Link href={`/course/${courseId}`}>
              <button type="button" className="learning-error-button">
                Back to course
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="learning-page">
      <PublicNavbar />
      <main className="learning-main">
        <div className="learning-container">
          <nav className="learning-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="learning-breadcrumb-divider">/</span>
            <Link href="/courses">Courses</Link>
            <span className="learning-breadcrumb-divider">/</span>
            <Link href={`/course/${courseId}`}>Course details</Link>
            <span className="learning-breadcrumb-divider">/</span>
            <span aria-current="page">Learning</span>
          </nav>

          <h1 className="learning-title">{course.title ?? 'Learning'}</h1>

          <LearningPlayerSection
            activeLecture={activeLecture}
            isVideoLecture={isVideoLecture}
            videoRef={videoRef}
            videoUrl={resolvedVideoUrl}
            onTimeUpdate={handleTimeUpdate}
            onMarkComplete={() => markLectureComplete(activeLecture.id)}
            markCompleteLoading={markingLectureId === activeLecture.id}
          />

          <div className="learning-layout">
            <div className="learning-support-column">
              <LearningCourseDetailsPanel
                activeLecture={activeLecture}
                activeSection={currentSection}
                completionRatio={completionRatio}
                resources={resources}
                onPrevious={previousLecture ? () => handleLectureSelect(previousLecture.id) : undefined}
                onNext={nextLecture ? () => handleLectureSelect(nextLecture.id) : undefined}
                hasPrevious={Boolean(previousLecture)}
                hasNext={Boolean(nextLecture)}
              />

              <LearningNotesPanel
                notes={currentNotes}
                noteDraft={noteDraft}
                onNoteDraftChange={setNoteDraft}
                onAddNote={handleAddNote}
                onSeekToNote={handleSeekToNote}
              />
            </div>

            <div className="learning-curriculum-column">
              <LearningCurriculumPanel
                courseTitle={course.title ?? 'Course curriculum'}
                completionRatio={completionRatio}
                sections={Array.isArray(course.sections) ? (course.sections as Section[]) : []}
                lectures={filteredLectures}
                activeLectureId={activeLecture.id}
                completedLectureIds={completedLectures}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onLectureSelect={handleLectureSelect}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
