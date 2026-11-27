import { isThemeId } from '@app/api/invitation-model'
import { createRoute, lazyRouteComponent, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { loginRoute } from './routes/login'
import { notesRoute } from './routes/notes'
import { rootRoute } from './routes/root'

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./site/home'), 'HomePage'),
})

const themesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tema',
  component: lazyRouteComponent(() => import('./site/themes'), 'ThemesPage'),
})

export const themePreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tema/$theme',
  validateSearch: z.object({ lang: z.enum(['id', 'en']).optional() }),
  beforeLoad: ({ params }) => {
    if (!isThemeId(params.theme)) throw notFound()
  },
  component: lazyRouteComponent(() => import('./invite/theme-preview'), 'ThemePreviewPage'),
})

const boothDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coba/booth',
  component: lazyRouteComponent(() => import('./booth/routes'), 'BoothDemoPage'),
})

const cameraDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coba/kamera',
  component: lazyRouteComponent(() => import('./camera/routes'), 'CameraDemoPage'),
})

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/buat',
  validateSearch: z.object({ tema: z.string().optional() }),
  component: lazyRouteComponent(() => import('./studio/onboarding'), 'OnboardingPage'),
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/studio',
  component: lazyRouteComponent(() => import('./studio/dashboard'), 'DashboardPage'),
})

export const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/studio/$id',
  component: lazyRouteComponent(() => import('./studio/shell'), 'StudioShell'),
})

const builderRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./studio/builder'), 'BuilderPage'),
})
const guestsRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/tamu',
  component: lazyRouteComponent(() => import('./studio/guests'), 'GuestsPage'),
})
const wishesRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/ucapan',
  component: lazyRouteComponent(() => import('./studio/wishes'), 'WishesPage'),
})
const checkInRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/check-in',
  component: lazyRouteComponent(() => import('./studio/checkin'), 'CheckInPage'),
})
const boothTabRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/booth',
  component: lazyRouteComponent(() => import('./booth/host'), 'BoothTab'),
})
const cameraTabRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/kamera',
  component: lazyRouteComponent(() => import('./camera/host'), 'CameraTab'),
})
const settingsRoute = createRoute({
  getParentRoute: () => studioRoute,
  path: '/pengaturan',
  component: lazyRouteComponent(() => import('./studio/settings'), 'SettingsPage'),
})

export const draftPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pratinjau/$id',
  component: lazyRouteComponent(() => import('./invite/draft-preview'), 'DraftPreviewPage'),
})

export const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$slug',
  validateSearch: z.object({ tamu: z.string().optional(), untuk: z.string().max(80).optional() }),
  component: lazyRouteComponent(() => import('./invite/public'), 'PublicInvitationPage'),
})

export const publicBoothRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$slug/booth',
  component: lazyRouteComponent(() => import('./booth/routes'), 'BoothPublicPage'),
})

export const publicCameraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$slug/kamera',
  component: lazyRouteComponent(() => import('./camera/routes'), 'CameraPublicPage'),
})

export const publicAlbumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$slug/album',
  component: lazyRouteComponent(() => import('./booth/routes'), 'AlbumPublicPage'),
})

export const routeTree = rootRoute.addChildren([
  homeRoute,
  themesRoute,
  themePreviewRoute,
  boothDemoRoute,
  cameraDemoRoute,
  onboardingRoute,
  dashboardRoute,
  studioRoute.addChildren([
    builderRoute,
    guestsRoute,
    wishesRoute,
    checkInRoute,
    boothTabRoute,
    cameraTabRoute,
    settingsRoute,
  ]),
  draftPreviewRoute,
  publicRoute,
  publicBoothRoute,
  publicCameraRoute,
  publicAlbumRoute,
  loginRoute,
  notesRoute,
])
