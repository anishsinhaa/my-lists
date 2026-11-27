import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireOwner } from '@/features/auth/RequireOwner'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { HomePage } from '@/features/home/HomePage'
import { ListAlias } from '@/features/lists/ListAlias'
import { ListPage } from '@/features/lists/ListPage'
import { MyListsPage } from '@/features/lists/MyListsPage'
import { LIST_IDS } from '@/types/lists'

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

function kitLoader() {
  return import('@/features/dev/KitPage').then((module) => ({ Component: module.KitPage }))
}

function settingsLoader() {
  return import('@/features/settings/SettingsPage').then((module) => ({ Component: module.SettingsPage }))
}

function picksLoader() {
  return import('@/features/picks/PicksPage').then((module) => ({ Component: module.PicksPage }))
}

function shelfLoader() {
  return import('@/features/home/ShelfPage').then((module) => ({ Component: module.ShelfPage }))
}

function searchLoader() {
  return import('@/features/search/SearchPage').then((module) => ({ Component: module.SearchPage }))
}

export const routes = [
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/shelf/:tileId', lazy: shelfLoader },
              { path: '/lists', element: <MyListsPage /> },
              { path: '/lists/:listId', element: <ListPage /> },
              { path: '/search', lazy: searchLoader },
              // Short links stay on refresh because vercel.json rewrites /((?!api/).*) to /index.html.
              ...LIST_IDS.map((listId) => ({ path: `/${listId}`, element: <ListAlias listId={listId} /> })),
              { element: <RequireOwner />, children: [
                { path: '/picks', lazy: picksLoader },
                { path: '/settings', lazy: settingsLoader },
              ] },
              ...(import.meta.env.DEV ? [{ path: '/dev/kit', lazy: kitLoader }] : []),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
