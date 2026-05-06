import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Spinner } from '@/components/ui/Spinner'

const LoginPage            = lazy(() => import('@/pages/auth/LoginPage'))
const ResetPasswordPage    = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'))
const UsersPage            = lazy(() => import('@/pages/admin/UsersPage'))
const SessionsPage         = lazy(() => import('@/pages/admin/SessionsPage'))
const AdminSessionDetail   = lazy(() => import('@/pages/admin/AdminSessionDetailPage'))
const FacilitatorDashboard = lazy(() => import('@/pages/facilitator/FacilitatorDashboard'))
const FacilitatorSession   = lazy(() => import('@/pages/facilitator/FacilitatorSessionDetailPage'))
const CourseHome           = lazy(() => import('@/pages/course/CourseHome'))
const SectionPage          = lazy(() => import('@/pages/course/SectionPage'))
const CourseHistoryPage    = lazy(() => import('@/pages/course/CourseHistoryPage'))

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Admin */}
              <Route path="/admin" element={
                <AuthGuard requiredRole="admin"><AdminDashboard /></AuthGuard>
              } />
              <Route path="/admin/users" element={
                <AuthGuard requiredRole="admin"><UsersPage /></AuthGuard>
              } />
              <Route path="/admin/sessions" element={
                <AuthGuard requiredRole="admin"><SessionsPage /></AuthGuard>
              } />
              <Route path="/admin/sessions/:id" element={
                <AuthGuard requiredRole="admin"><AdminSessionDetail /></AuthGuard>
              } />

              {/* Facilitator */}
              <Route path="/facilitator" element={
                <AuthGuard requiredRole="facilitator"><FacilitatorDashboard /></AuthGuard>
              } />
              <Route path="/facilitator/sessions/:id" element={
                <AuthGuard requiredRole="facilitator"><FacilitatorSession /></AuthGuard>
              } />

              {/* Participant course */}
              <Route path="/course" element={
                <AuthGuard requiredRole="participant"><CourseHome /></AuthGuard>
              } />
              <Route path="/course/history" element={
                <AuthGuard requiredRole="participant"><CourseHistoryPage /></AuthGuard>
              } />
              <Route path="/course/:sectionSlug" element={
                <AuthGuard requiredRole="participant"><SectionPage /></AuthGuard>
              } />

              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
