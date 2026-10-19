import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RequireAuth } from '../components/RequireAuth'
import { AdminPage } from '../pages/AdminPage'
import { CreateEventPage } from '../pages/CreateEventPage'
import { DiscussionPage } from '../pages/DiscussionPage'
import { EventDetailPage } from '../pages/EventDetailPage'
import { EventJoinPage } from '../pages/EventJoinPage'
import { EventsCatalogPage } from '../pages/EventsCatalogPage'
import { EventsFeedPage } from '../pages/EventsFeedPage'
import { LoginPage } from '../pages/LoginPage'
import { MyEventsPage } from '../pages/MyEventsPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { OrgPage } from '../pages/OrgPage'
import { ProfilePage } from '../pages/ProfilePage'
import { RegisterPage } from '../pages/RegisterPage'
import { SportHubPage } from '../pages/SportHubPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<EventsFeedPage />} />
        <Route path="events" element={<EventsCatalogPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route
          path="events/:id/join"
          element={
            <RequireAuth>
              <EventJoinPage />
            </RequireAuth>
          }
        />
        <Route path="events/:id/discussion" element={<DiscussionPage />} />
        <Route path="sport/:slug" element={<SportHubPage />} />
        <Route
          path="my-events"
          element={
            <RequireAuth>
              <MyEventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="create-event"
          element={
            <RequireAuth>
              <CreateEventPage />
            </RequireAuth>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="org" element={<OrgPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
