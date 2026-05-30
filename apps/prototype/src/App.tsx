/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LanguageProvider } from './LanguageContext';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesCloud from './components/FeaturesCloud';
import MissionSection from './components/MissionSection';
import MembersAndAcademies from './components/MembersAndAcademies';
import FeaturedSchools from './components/FeaturedSchools';
import PartnersSection from './components/PartnersSection';
import AppPromotion from './components/AppPromotion';
import Testimonials from './components/Testimonials';
import CallToAction from './components/CallToAction';
import PaymentMethods from './components/PaymentMethods';
import AppDownloadBanner from './components/AppDownloadBanner';
import Footer from './components/Footer';

// New dynamic pages imported
import ExploreDatabase from './components/ExploreDatabase';
import SchoolPublicPage from './components/SchoolPublicPage';

import MartialOnlineLanding from './components/MartialOnlineLanding';
import MartialOnlineDashboard from './components/MartialOnlineDashboard';
import { INITIAL_COURSES } from './components/academyData';
import { AcademyCourse } from './components/academyTypes';

export type ViewType = 'home' | 'explore' | 'school-detail' | 'academy' | 'academy-dashboard';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('roger-gracie-malaga');
  
  // Immersive online academy states
  const [userBalance, setUserBalance] = useState<number>(250.00);
  const [coursesList, setCoursesList] = useState<AcademyCourse[]>(INITIAL_COURSES);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState<string[]>(['course-1']);
  const [subscribedTierId, setSubscribedTierId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string }[]>([]);

  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, text: message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Multi-route instant visual scroll alignment
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeView]);

  // Unified global router callback
  const handleNavigate = (view: ViewType, sectionId?: string) => {
    setActiveView(view);
    
    if (view === 'home' && sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleLogout = () => {
    // Reset online academy simulation states
    setUserBalance(250.00);
    setPurchasedCourseIds(['course-1']);
    setSubscribedTierId(null);
    
    // Smoothly redirect to home
    handleNavigate('home');

    // Extract persisted language to display localized logout success toast
    const savedLang = localStorage.getItem('martial_online_lang') || 'en';
    let msg = 'Logout successful! Your session has been safely reset.';
    if (savedLang === 'es') {
      msg = '¡Sesión cerrada con éxito! Tu sesión ha sido restablecida.';
    } else if (savedLang === 'pt') {
      msg = 'Sessão encerrada com sucesso! Sua sessão foi redefinida.';
    } else if (savedLang === 'fr') {
      msg = 'Déconnexion réussie ! Votre session a été réinitialisée.';
    }
    
    addNotification(`🔒 ${msg}`);
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-[#fafafa] selection:bg-sky-500 selection:text-white" id="main-application-wrapper">
      
      {/* 1. Integrated Header System with Navigation triggers */}
      <Header activeView={activeView} onNavigate={handleNavigate} onLogout={handleLogout} />

      {/* Main Container Assembly govern by activeView state engine */}
      <main className="flex-grow">
        {activeView === 'home' && (
          <div id="home-view-wrapper">
            {/* 2. Hero banner with interactive sliding indicators */}
            <HeroSection />

            {/* 3. Technology Integration and Simulated cloud portal */}
            <div id="technology">
              <FeaturesCloud />
            </div>

            {/* 4. Cyan Brand Mission Statement Banner */}
            <MissionSection />

            {/* 5. Members vs Academies twin layout modules */}
            <div id="learning">
              <MembersAndAcademies />
            </div>

            {/* 6. Featured Schools where clicking 'Explore All' goes to map view */}
            <div id="schools">
              <FeaturedSchools />
              
              {/* Extra interactive access bar for featured schools section */}
              <div className="max-w-7xl mx-auto px-4 pb-12 flex justify-center">
                <button
                  onClick={() => handleNavigate('explore')}
                  className="px-8 py-4 bg-gradient-to-r from-sky-500 to-[#0092ff] text-white hover:opacity-95 text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Explore All Academies on Interactive Map
                </button>
              </div>
            </div>

            {/* 7. Business Associates and Partner Matrix stats */}
            <PartnersSection />

            {/* 8. On-the-go Smartphone mockup interactive catalog router */}
            <AppPromotion />

            {/* 9. User success star testimonials and logs */}
            <Testimonials />

            {/* 10. Dark athletic background focus action banner */}
            <div className="bg-slate-900 text-white py-16 px-4">
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <h3 className="text-xl sm:text-3xl font-extrabold uppercase tracking-wider">
                  Ready to take control of your martial journey?
                </h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Log in to your dojo dashboard or explore Malaga and global networks today. Free trial booking synced instantly.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => handleNavigate('explore')}
                    className="px-8 py-3.5 bg-[#0092ff] hover:bg-[#007cd7] text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-lg cursor-pointer"
                  >
                    Launch Interactive Map Search
                  </button>
                  <button
                    onClick={() => handleNavigate('school-detail')}
                    className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-lg border border-slate-700 cursor-pointer"
                  >
                    View Roger Gracie Malaga Page
                  </button>
                </div>
              </div>
            </div>

            {/* 11. Certified instant checkout providers panel */}
            <div id="payment-methods-section">
              <PaymentMethods />
            </div>

            {/* 12. Bottom application download badge shelf and highlights */}
            <AppDownloadBanner />
          </div>
        )}

        {/* 13. Dynamic Explore view splitter matching Image 2 */}
        {activeView === 'explore' && (
          <ExploreDatabase
            onSelectSchool={(schoolId) => {
              setSelectedSchoolId(schoolId);
              setActiveView('school-detail');
            }}
          />
        )}

        {/* 14. Dedicated Dojo Public profile detail page matching Image 1 */}
        {activeView === 'school-detail' && (
          <SchoolPublicPage
            schoolId={selectedSchoolId}
            onBackToExplore={() => setActiveView('explore')}
          />
        )}

        {/* 14b. Martial Online Public Learning Academy/Marketplace */}
        {activeView === 'academy' && (
          <MartialOnlineLanding
            onNavigateToDashboard={() => setActiveView('academy-dashboard')}
            onNavigateToView={handleNavigate}
            userBalance={userBalance}
            setUserBalance={setUserBalance}
            purchasedCourseIds={purchasedCourseIds}
            setPurchasedCourseIds={setPurchasedCourseIds}
            subscribedTierId={subscribedTierId}
            setSubscribedTierId={setSubscribedTierId}
            addNotification={addNotification}
          />
        )}

        {/* 14c. Interactive Creator & Patreon Monetization Dashboard */}
        {activeView === 'academy-dashboard' && (
          <MartialOnlineDashboard
            onBackToLanding={() => setActiveView('academy')}
            userBalance={userBalance}
            setUserBalance={setUserBalance}
            coursesList={coursesList}
            setCoursesList={setCoursesList}
            addNotification={addNotification}
            subscribedTierId={subscribedTierId}
          />
        )}
      </main>

      {/* Floating Notification Hub */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none" id="notification-hub">
        {notifications.map((n) => (
          <div key={n.id} className="bg-slate-900 border border-slate-800 text-white shadow-xl rounded-xl px-4 py-3 text-xs font-black tracking-wide flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {/* 15. Double integrated social marketing copyright footer */}
      <Footer />
      </div>
    </LanguageProvider>
  );
}
