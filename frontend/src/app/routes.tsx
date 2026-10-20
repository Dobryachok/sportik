import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { RequireAuth } from '../components/RequireAuth';

import { AdminPage } from '../pages/AdminPage';
import { CreateEventPage } from '../pages/CreateEventPage';
import { DiscussionPage } from '../pages/DiscussionPage';
import { EditEventPage } from '../pages/EditEventPage';
import { EventDetailPage } from '../pages/EventDetailPage';
import { EventJoinPage } from '../pages/EventJoinPage';
import { EventsCatalogPage } from '../pages/EventsCatalogPage';
import { EventsFeedPage } from '../pages/EventsFeedPage';
import { LoginPage } from '../pages/LoginPage';
import { MyEventsPage } from '../pages/MyEventsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { OrgPage } from '../pages/OrgPage';
import { OrganizationPublicPage } from '../pages/OrganizationPublicPage';
import { ProfilePage } from '../pages/ProfilePage';
import { PublicProfilePage } from '../pages/PublicProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { SportHubPage } from '../pages/SportHubPage';
const SportikPage = lazy(() => import('../pages/SportikPage').then((module) => ({ default: module.SportikPage })));
import { TamagotchiPage } from '../pages/TamagotchiPage';
import { TournamentsPage } from '../pages/TournamentsPage';
import { DiscoveryPage } from '../pages/DiscoveryPage';
import { TeamDetailPage } from '../pages/TeamDetailPage';

const protectedPage = (node: ReactNode) => (
    <RequireAuth>{node}</RequireAuth>
);

export function AppRoutes() {
    return (
        <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

            <Route element={<AppShell />}>
                <Route index element={<EventsFeedPage />} />

                <Route
                    path="events"
                    element={<EventsCatalogPage />}
                />

                <Route
                    path="events/:id"
                    element={<EventDetailPage />}
                />

                <Route
                    path="events/:id/edit"
                    element={protectedPage(<EditEventPage />)}
                />

                <Route
                    path="events/:id/join"
                    element={protectedPage(<EventJoinPage />)}
                />

                <Route
                    path="events/:id/discussion"
                    element={<DiscussionPage />}
                />

                <Route
                    path="tournaments"
                    element={<TournamentsPage />}
                />

                <Route
                    path="tamagotchi"
                    element={protectedPage(<TamagotchiPage />)}
                />

                <Route
                    path="users/:id"
                    element={<PublicProfilePage />}
                />

                <Route
                    path="organizations/:id"
                    element={<OrganizationPublicPage />}
                />

                <Route
                    path="sport/:slug"
                    element={<SportHubPage />}
                />

                <Route
                    path="sportik"
                    element={protectedPage(
                        <Suspense
                            fallback={
                                <div className="flex min-h-[50vh] flex-1 items-center justify-center px-4 text-sm text-muted">
                                    Загрузка Спортика…
                                </div>
                            }
                        >
                            <SportikPage />
                        </Suspense>,
                    )}
                />

                <Route
                    path="my-events"
                    element={protectedPage(<MyEventsPage />)}
                />

                <Route
                    path="notifications"
                    element={protectedPage(<NotificationsPage />)}
                />

                <Route
                    path="profile"
                    element={protectedPage(<ProfilePage />)}
                />

                <Route
                    path="discovery"
                    element={protectedPage(<DiscoveryPage />)}
                />

                <Route
                    path="teams/:id"
                    element={protectedPage(<TeamDetailPage />)}
                />

                <Route
                    path="create-event"
                    element={protectedPage(<CreateEventPage />)}
                />

                <Route
                    path="admin"
                    element={protectedPage(<AdminPage />)}
                />

                <Route
                    path="org"
                    element={protectedPage(<OrgPage />)}
                />

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Route>
        </Routes>
    );
}