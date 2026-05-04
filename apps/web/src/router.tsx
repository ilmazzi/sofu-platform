import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import BackofficeAuditLogsPage from './pages/BackofficeAuditLogsPage'
import BackofficeDashboardPage from './pages/BackofficeDashboardPage'
import BackofficeReviewQueuePage from './pages/BackofficeReviewQueuePage'
import BackofficeUsersPage from './pages/BackofficeUsersPage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import CampaignsPage from './pages/CampaignsPage'
import CampaignFormPage from './pages/CampaignFormPage'
import HomePage from './pages/HomePage'
import MyCampaignsPage from './pages/MyCampaignsPage'
import MyReservationsPage from './pages/MyReservationsPage'
import PaymentCompletePage from './pages/PaymentCompletePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/new', element: <CampaignFormPage /> },
      { path: 'campaigns/:slug/edit', element: <CampaignFormPage /> },
      { path: 'campaigns/:slug', element: <CampaignDetailPage /> },
      { path: 'me/reservations', element: <MyReservationsPage /> },
      { path: 'payments/complete', element: <PaymentCompletePage /> },
      { path: 'me/campaigns', element: <MyCampaignsPage /> },
      { path: 'backoffice', element: <BackofficeDashboardPage /> },
      { path: 'backoffice/review', element: <BackofficeReviewQueuePage /> },
      { path: 'backoffice/audit-logs', element: <BackofficeAuditLogsPage /> },
      { path: 'backoffice/users', element: <BackofficeUsersPage /> },
    ],
  },
])
