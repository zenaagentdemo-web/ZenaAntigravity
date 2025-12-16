import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BottomNavigation } from './components/BottomNavigation/BottomNavigation';
import { OfflineIndicator } from './components/OfflineIndicator/OfflineIndicator';
import { PrivateRoute } from './components/PrivateRoute/PrivateRoute';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { SkipLink } from './components/SkipLink/SkipLink';
import { PageTransition } from './components/PageTransition/PageTransition';
import { useAuth } from './hooks/useAuth';
import { realTimeDataService } from './services/realTimeDataService';
import { errorHandlingService } from './services/errorHandlingService';
import './App.css';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage/RegisterPage').then(m => ({ default: m.RegisterPage })));
const HomePage = lazy(() => import('./pages/HomePage/HomePage').then(m => ({ default: m.HomePage })));
const EnhancedHomeDashboard = lazy(() => import('./pages/EnhancedHomeDashboard/EnhancedHomeDashboard').then(m => ({ default: m.EnhancedHomeDashboard })));
const HighTechDashboardPage = lazy(() => import('./pages/HighTechDashboardPage/HighTechDashboardPage').then(m => ({ default: m.HighTechDashboardPage })));
const FocusPage = lazy(() => import('./pages/FocusPage/FocusPage').then(m => ({ default: m.FocusPage })));
const NewPage = lazy(() => import('./pages/NewPage/NewPage').then(m => ({ default: m.NewPage })));
const WaitingPage = lazy(() => import('./pages/WaitingPage/WaitingPage').then(m => ({ default: m.WaitingPage })));
const AskZenaPage = lazy(() => import('./pages/AskZenaPage/AskZenaPage').then(m => ({ default: m.AskZenaPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage/ContactsPage').then(m => ({ default: m.ContactsPage })));
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage/PropertyDetailPage').then(m => ({ default: m.PropertyDetailPage })));
const DealDetailPage = lazy(() => import('./pages/DealDetailPage/DealDetailPage').then(m => ({ default: m.DealDetailPage })));
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage/ThreadDetailPage').then(m => ({ default: m.ThreadDetailPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage/SearchPage').then(m => ({ default: m.SearchPage })));
const AvatarDemoPage = lazy(() => import('./pages/AvatarDemoPage/AvatarDemoPage').then(m => ({ default: m.AvatarDemoPage })));
const AskZenaImmersive = lazy(() => import('./pages/AskZenaPage/AskZenaImmersive').then(m => ({ default: m.AskZenaImmersive })));

// Loading skeleton component with accessibility
const LoadingSkeleton: React.FC = () => (
  <div
    className="loading-skeleton"
    role="progressbar"
    aria-label="Loading page content"
    aria-busy="true"
  >
    <div className="loading-skeleton__content">
      <div className="loading-skeleton__spinner" aria-hidden="true"></div>
      <p className="sr-only">Loading page content, please wait...</p>
      <p aria-hidden="true">Loading...</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Initialize services when app starts
  useEffect(() => {
    if (isAuthenticated) {
      // Initialize real-time data service for authenticated users
      realTimeDataService.initialize();
    }

    // Cleanup on unmount
    return () => {
      realTimeDataService.disconnect();
      errorHandlingService.destroy();
    };
  }, [isAuthenticated]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorHandlingService.reportError(error, {
          component: 'App',
          props: { isAuthenticated, isLoading }
        }, 'critical', errorInfo);
      }}
    >
      <ThemeProvider>
        <Router>
          <div className="app" role="application" aria-label="Zena AI Real Estate Assistant">
            {/* Skip links for keyboard navigation - WCAG 2.1 AA */}
            <SkipLink
              targetId="main-content"
              text="Skip to main content"
              additionalLinks={[
                { targetId: 'bottom-navigation', text: 'Skip to navigation' }
              ]}
            />
            <Suspense fallback={<LoadingSkeleton />}>
              <Routes>
                {/* Public routes */}
                <Route path="/avatar-demo" element={<AvatarDemoPage />} />
                <Route path="/ask-zena-immersive" element={<AskZenaImmersive />} />
                <Route
                  path="/login"
                  element={
                    isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
                  }
                />
                <Route
                  path="/register"
                  element={
                    isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <PrivateRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                      <>
                        <OfflineIndicator />

                        <main
                          id="main-content"
                          className="app__main"
                          role="main"
                          aria-label="Main content"
                          tabIndex={-1}
                        >
                          <Suspense fallback={<LoadingSkeleton />}>
                            <PageTransition
                              transitionType="glow-fade"
                              duration="normal"
                              enableGlow={true}
                            >
                              <Routes>
                                <Route path="/" element={<HighTechDashboardPage />} />
                                <Route path="/home-enhanced" element={<EnhancedHomeDashboard />} />
                                <Route path="/home-classic" element={<HomePage />} />
                                <Route path="/focus" element={<FocusPage />} />
                                <Route path="/new" element={<NewPage />} />
                                <Route path="/waiting" element={<WaitingPage />} />
                                <Route path="/ask-zena" element={<AskZenaPage />} />
                                <Route path="/contacts" element={<ContactsPage />} />
                                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                                <Route path="/properties" element={<PropertiesPage />} />
                                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                                <Route path="/deals/:id" element={<DealDetailPage />} />
                                <Route path="/threads/:id" element={<ThreadDetailPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                              </Routes>
                            </PageTransition>
                          </Suspense>
                        </main>

                        <nav id="bottom-navigation" aria-label="Main navigation">
                          <BottomNavigation />
                        </nav>
                      </>
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
