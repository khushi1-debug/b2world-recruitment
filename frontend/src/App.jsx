import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import PostJob from './pages/PostJob'
import Candidates from './pages/Candidates'
import AllCandidates from './pages/AllCandidates'
import Dashboard from './pages/Dashboard'
import TrackApplication from './pages/TrackApplication'

const HIRING_ROLES = ['super_admin', 'hr_manager', 'recruiter']

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/track-application" element={<TrackApplication />} />
        <Route
          path="/jobs/new"
          element={
            <ProtectedRoute roles={HIRING_ROLES}>
              <PostJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id/candidates"
          element={
            <ProtectedRoute roles={HIRING_ROLES}>
              <Candidates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidates"
          element={
            <ProtectedRoute roles={HIRING_ROLES}>
              <AllCandidates />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Home />} />
      </Routes>
    </AuthProvider>
  )
}
