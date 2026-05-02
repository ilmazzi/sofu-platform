import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import BackofficeReviewQueuePage from './pages/BackofficeReviewQueuePage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import CreateCampaignPage from './pages/CreateCampaignPage'
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
      { path: 'campaigns', element: <HomePage /> },
      { path: 'campaigns/new', element: <CreateCampaignPage /> },
      { path: 'campaigns/:slug', element: <CampaignDetailPage /> },
      { path: 'me/reservations', element: <MyReservationsPage /> },
      { path: 'payments/complete', element: <PaymentCompletePage /> },
      { path: 'me/campaigns', element: <MyCampaignsPage /> },
      { path: 'backoffice/review', element: <BackofficeReviewQueuePage /> },
    ],
  },
])
