import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ZenaAvatarWidget } from './components/ZenaAvatarWidget/ZenaAvatarWidget';
import './App.css';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage/RegisterPage').then(m => ({ default: m.RegisterPage })));
const HomePage = lazy(() => import('./pages/HomePage/HomePage').then(m => ({ default: m.HomePage })));
const EnhancedHomeDashboard = lazy(() => import('./pages/EnhancedHomeDashboard/EnhancedHomeDashboard').then(m => ({ default: m.EnhancedHomeDashboard })));
const HighTechDashboardPage = lazy(() => import('./pages/HighTechDashboardPage/HighTechDashboardPage').then(m => ({ default: m.HighTechDashboardPage })));
const FocusPage = lazy(() => import('./pages/FocusPage/FocusPage').then(m => ({ default: m.FocusPage })));
const InboxPage = lazy(() => import('./pages/InboxPage/InboxPage').then(m => ({ default: m.InboxPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage/ContactsPage').then(m => ({ default: m.ContactsPage })));
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage/PropertyDetailPage').then(m => ({ default: m.PropertyDetailPage })));
const DealDetailPage = lazy(() => import('./pages/DealDetailPage/DealDetailPage').then(m => ({ default: m.DealDetailPage })));
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage/ThreadDetailPage').then(m => ({ default: m.ThreadDetailPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage/SearchPage').then(m => ({ default: m.SearchPage })));
const AvatarDemoPage = lazy(() => import('./pages/AvatarDemoPage/AvatarDemoPage').then(m => ({ default: m.AvatarDemoPage })));
const AskZenaPage = lazy(() => import('./pages/AskZenaPage/AskZenaPage').then(m => ({ default: m.AskZenaPage })));
const AskZenaImmersive = lazy(() => import('./pages/AskZenaPage/AskZenaImmersive').then(m => ({ default: m.AskZenaImmersive })));
const DealFlowPage = lazy(() => import('./pages/DealFlowPage/DealFlowPage').then(m => ({ default: m.DealFlowPage })));
const TasksPage = lazy(() => import('./pages/TasksPage/TasksPage').then(m => ({ default: m.TasksPage })));
const PixelExplosionDemo = lazy(() => import('./pages/PixelExplosionDemo/PixelExplosionDemo'));
const ZenaAskPageDemo = lazy(() => import('./pages/ZenaAskPage/ZenaAskPage').then(m => ({ default: m.ZenaAskPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage/CalendarPage').then(m => ({ default: m.CalendarPage })));


// Minimal loading skeleton - appears instantly for fast perceived loading
const LoadingSkeleton: React.FC = () => (
  <div
    className="loading-skeleton loading-skeleton--instant"
    role="progressbar"
    aria-label="Loading page content"
    aria-busy="true"
  >
    <p className="sr-only">Loading page content, please wait...</p>
  </div>
);

/**
 * GlobalFloatingZena - Persistent Zena widget that follows the user
 * across the application, except on the Ask Zena pages.
 */
const GlobalFloatingZena: React.FC = () => {
  const location = useLocation();
  const hidePaths = ['/ask-zena', '/ask-zena-immersive', '/zena-demo', '/deal-flow'];
  const shouldHide = hidePaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  return <ZenaAvatarWidget variant="floating" />;
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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
            <GlobalFloatingZena />
            <Suspense fallback={<LoadingSkeleton />}>
              <Routes>
                {/* Public routes */}
                <Route path="/avatar-demo" element={<AvatarDemoPage />} />
                <Route path="/ask-zena-immersive" element={<AskZenaImmersive />} />
                <Route path="/pixel-demo" element={<PixelExplosionDemo />} />
                <Route path="/zena-demo" element={<ZenaAskPageDemo />} />
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
                              duration="fast"
                              enableGlow={true}
                            >
                              <Routes>
                                <Route path="/" element={<HighTechDashboardPage />} />
                                <Route path="/home-enhanced" element={<EnhancedHomeDashboard />} />
                                <Route path="/home-classic" element={<HomePage />} />
                                <Route path="/focus" element={<FocusPage />} />
                                <Route path="/inbox" element={<InboxPage />} />
                                <Route path="/new" element={<Navigate to="/inbox?tab=new" replace />} />
                                <Route path="/waiting" element={<Navigate to="/inbox?tab=awaiting" replace />} />
                                <Route path="/deal-flow" element={<DealFlowPage />} />
                                <Route path="/ask-zena" element={<AskZenaPage />} />
                                <Route path="/contacts" element={<ContactsPage />} />
                                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                                <Route path="/properties" element={<PropertiesPage />} />
                                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                                <Route path="/deals/:id" element={<DealDetailPage />} />
                                <Route path="/threads/:id" element={<ThreadDetailPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/tasks" element={<TasksPage />} />
                                <Route path="/calendar" element={<CalendarPage />} />
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
