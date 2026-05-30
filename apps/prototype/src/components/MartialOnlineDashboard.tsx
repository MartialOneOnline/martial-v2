/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { 
  BarChart3, 
  BookOpen, 
  Video, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Award, 
  HelpCircle,
  PlusCircle,
  TrendingUp,
  CreditCard,
  UserCheck,
  ChevronDown,
  LayoutDashboard,
  Megaphone,
  Briefcase,
  Share2,
  Trash2,
  Bell,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { AcademyCourse, FeedComment, SupportTicket, UpcomingLiveClass } from './academyTypes';
import { INITIAL_FEED_COMMENTS, SUPPORT_TICKETS, UPCOMING_LIVE_CLASSES } from './academyData';

interface MartialOnlineDashboardProps {
  onBackToLanding: () => void;
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  coursesList: AcademyCourse[];
  setCoursesList: React.Dispatch<React.SetStateAction<AcademyCourse[]>>;
  addNotification: (message: string) => void;
  subscribedTierId: string | null;
}

export default function MartialOnlineDashboard({
  onBackToLanding,
  userBalance,
  setUserBalance,
  coursesList,
  setCoursesList,
  addNotification,
  subscribedTierId
}: MartialOnlineDashboardProps) {
  const { t, language } = useLanguage();
  
  // Local states for interactivity
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('39.00');
  const [newCourseCategory, setNewCourseCategory] = useState<'BJJ' | 'MMA' | 'Striking' | 'Fitness'>('BJJ');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);
  
  const [comments, setComments] = useState<FeedComment[]>(INITIAL_FEED_COMMENTS);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [tickets, setTickets] = useState<SupportTicket[]>(SUPPORT_TICKETS);
  const [liveClasses, setLiveClasses] = useState<UpcomingLiveClass[]>(UPCOMING_LIVE_CLASSES);

  // Stats from Image 2
  const totalSalesCount = coursesList.reduce((acc, c) => acc + c.enrollCount, 0);
  const totalIncomeGenerated = coursesList.reduce((acc, c) => acc + (c.price * c.enrollCount), 0);

  const handleAddFunds = () => {
    setUserBalance(prev => Number((prev + 50.00).toFixed(2)));
    addNotification('💵 Simulated Wallet successfully funded with $50.00!');
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      addNotification('Please specify a title for the course!');
      return;
    }

    const newCourse: AcademyCourse = {
      id: `course-${Date.now()}`,
      title: newCourseName.toUpperCase(),
      instructor: {
        name: 'You (Dojo Head Instructor)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        role: 'Verified Elite Academy Creator',
        subscribersCount: 1,
      },
      category: newCourseCategory,
      description: newCourseDesc || 'No course syllabus provided yet. Unlocked for student memberships.',
      price: parseFloat(newCoursePrice) || 0,
      isSubscriptionOnly: false,
      image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600',
      rating: 5.0,
      enrollCount: 0,
      lessonsCount: 8,
      durationHours: 6.5,
    };

    setCoursesList(prev => [newCourse, ...prev]);
    addNotification(`🚀 Course live & ready for purchase: ${newCourse.title}!`);
    
    // reset form
    setNewCourseName('');
    setNewCourseDesc('');
    setAddingCourse(false);
  };

  const handlePostCommentReply = (commentId: string) => {
    if (!replyText.trim()) return;
    
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          comment: `${c.comment}\n👉 Reply (Dojo Advisor): "${replyText}"`
        };
      }
      return c;
    }));

    addNotification('💬 Reply posted to instructor feed log.');
    setReplyText('');
    setReplyTarget(null);
  };

  const handleResolveTicket = (ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'Closed' as const };
      }
      return t;
    }));
    addNotification('🎫 Support ticket resolved successfully.');
  };

  const handleLaunchClass = (classId: string) => {
    setLiveClasses(prev => prev.map(lc => {
      if (lc.id === classId) {
        return { ...lc, status: 'Live Now' as const };
      }
      return lc;
    }));
    addNotification('🔴 Broadcast stream initiated! High speed low-latency live roll is active.');
  };

  // Structured sidebar components from screenshot Image 2
  const sidebarSections = [
    {
      title: 'Edu Core Portal',
      items: [
        'Dashboard', 'Courses', 'Course Bundles', 'Upcoming Courses', 
        'Quizzes', 'Certificates', 'Assignments', 'Course Forum', 
        'Course Notices', 'Enrollments', 'Waitlists', 'Categories'
      ]
    },
    {
      title: 'Advising & Meet',
      items: ['Consultants', 'Meetings']
    },
    {
      title: 'Users & Roles',
      items: ['Users', 'Access Management', 'User Roles', 'Groups', 'Badges', 'Instructor Requests']
    },
    {
      title: 'CRM Hub',
      items: ['Support', 'Courses Support', 'Comments', 'Reports', 'Noticeboard', 'Notifications']
    },
    {
      title: 'Marketing & Patreon Ads',
      items: ['Balances', 'Sales List', 'Payout', 'Sponsor Tiers', 'Coupons', 'Cashback', 'Registration Bonus']
    }
  ];

  return (
    <div className="bg-[#f0f4f8] text-slate-800 min-h-screen font-sans flex">
      
      {/* 1. Left Sidebar - Image 2 precise structure */}
      <aside className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 select-none ${
        sidebarExpanded ? 'w-64' : 'w-20'
      } shrink-0 hidden md:flex`}>
        
        {/* Brand Banner */}
        <div className="h-20 border-b border-slate-800 flex items-center justify-between px-5">
          {sidebarExpanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-black text-white text-sm">
                M
              </div>
              <span className="font-black text-xs tracking-wider text-white uppercase leading-none">
                Instructor Console
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-sky-500 flex items-center justify-center font-black text-white text-sm">
              M
            </div>
          )}
        </div>

        {/* Dynamic Sidebar Scroller */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-none space-y-4 px-3 text-left">
          {sidebarSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {sidebarExpanded && (
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                  {sec.title}
                </p>
              )}
              {sec.items.map((item) => {
                const isActive = activeSidebarItem === item;
                return (
                  <button
                    key={item}
                    onClick={() => {
                      setActiveSidebarItem(item);
                      if (item === 'Sponsor Tiers') {
                        addNotification('ℹ️ Patreon Subscription Tiers represent recurring supporter logs.');
                      }
                    }}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive 
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {sidebarExpanded && <span>{item}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-slate-800 text-xs font-bold text-slate-500 text-center">
          {sidebarExpanded ? (
            <div className="flex justify-between items-center">
              <span>Admin V2.4</span>
              <button 
                onClick={() => setSidebarExpanded(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ◀ Shrink
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setSidebarExpanded(true)}
              className="text-slate-400 hover:text-white cursor-pointer mx-auto"
            >
              ▶
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-x-hidden text-left">
        
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              {t('dash.welcome')}
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {t('dash.p_memberships')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Wallet fund injector */}
            <button
              onClick={handleAddFunds}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <CreditCard className="w-4 h-4" /> {t('dash.fund_wallet')}
            </button>

            {/* Launch course builder */}
            <button
              onClick={() => setAddingCourse(true)}
              className="bg-[#0092ff] hover:bg-[#007cd7] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/10 cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <PlusCircle className="w-4 h-4 animate-bounce" /> {t('dash.upload_course')}
            </button>

            {/* Back to public page */}
            <button
              onClick={onBackToLanding}
              className="bg-slate-800 hover:bg-slate-950 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              {t('dash.back_catalog')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wallet balance display card */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 mb-6 border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#0092ff]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest bg-sky-950 px-2.5 py-1 rounded-md border border-sky-900/50">
              Interactive Test Wallet Account
            </span>
            <p className="text-lg font-black text-slate-100 mt-2">
              Balance: <span className="text-sky-400">${userBalance.toFixed(2)}</span>
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Use this simulating account balance to test course purchases or sponsor recurring subscription tiers inside the catalog view!
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-center">
            <span className="text-[9px] font-black text-indigo-400 block">PATREON TIER STATUS</span>
            <span className="text-xs font-black text-slate-100 mt-1 block">
              {subscribedTierId 
                ? `Active Tier: ${subscribedTierId.replace('tier-', '').toUpperCase()}` 
                : 'No Active Subscription'}
            </span>
          </div>
        </div>

        {/* 3. Primary Dashboard Financial Metrics Row - Replica of Image 2 & 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Card 1: Sales Type Daily Stats */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md text-left">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">CREATOR DAILY REVENUE</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">$0.00</h3>
              </div>
              <span className="bg-sky-50 text-sky-600 text-[10px] sm:text-xs font-black px-2 py-1 rounded-md">Live Platform</span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>🟢 Live Classes:</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between">
                <span>📘 Video Courses:</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between text-indigo-600 font-extrabold">
                <span>💖 Patreon Membership income:</span>
                <span>$1,125.17</span>
              </div>
            </div>
          </div>

          {/* Card 2: Platform Income Ledger */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md text-left">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">TOTAL EXTENDED EARNINGS</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  ${(1125.17 + totalIncomeGenerated).toFixed(2)}
                </h3>
              </div>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] sm:text-xs font-black px-2 py-1 rounded-md">Patreon Sync</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>📅 Month Income:</span>
                <span>$214.50</span>
              </div>
              <div className="flex justify-between">
                <span>🏆 Year Income:</span>
                <span>$890.00</span>
              </div>
              <div className="flex justify-between font-extrabold text-indigo-600">
                <span>💸 Direct Course Sales:</span>
                <span>${totalIncomeGenerated.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Enroll / Sales Count */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md text-left">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">STUDENT COURSE READS</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {(87 + totalSalesCount)}
                </h3>
              </div>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs font-black px-2 py-1 rounded-md">Lifetime Views</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>📈 Today views:</span>
                <span>+3 members</span>
              </div>
              <div className="flex justify-between">
                <span>🎯 Active Subscribers:</span>
                <span>268 fans</span>
              </div>
              <div className="flex justify-between font-extrabold text-[#ff424d]">
                <span>❤️ Patreon Support rate:</span>
                <span>94%</span>
              </div>
            </div>
          </div>

        </div>

        {/* 4. Mini Notifications Status Row - Image 2 precise boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'New Sale', count: `6`, color: 'bg-emerald-500 text-white' },
            { label: 'New Comment', count: `3`, color: 'bg-sky-500 text-white' },
            { label: 'Pending Review Courses', count: `5`, color: 'bg-amber-500 text-white' },
            { label: 'Support Tickets', count: `${tickets.filter(t => t.status==='Pending Reply').length}`, color: 'bg-rose-500 text-white' },
          ].map((item, idx) => (
            <div key={idx} className={`${item.color} rounded-2xl p-4 flex items-center justify-between shadow-xs text-left`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</p>
                <h4 className="text-2xl font-black mt-1">{item.count}</h4>
              </div>
              <Bell className="w-5 h-5 opacity-50 shrink-0" />
            </div>
          ))}
        </div>

        {/* 5. Custom Interactive Chart, Comments Feed Combo - Image 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Sales Statistics Chart Box */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm col-span-2 text-left">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black tracking-widest text-[#0092ff] uppercase">📊 PERFORMANCE CHART</h3>
                <h4 className="text-lg font-black text-slate-800">Visual Sales Statistics</h4>
              </div>
              <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                JAN - DEC LOG
              </span>
            </div>

            {/* Custom Interactive SVG Line Plot to maximize performance and avoid React 19 crashes */}
            <div className="relative w-full h-64 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-4">
              
              {/* Inner Y-Grid lines */}
              <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-slate-200/60 pointer-events-none" />
              <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-slate-200/60 pointer-events-none" />
              <div className="absolute inset-x-0 top-3/4 border-b border-dashed border-slate-200/60 pointer-events-none" />

              {/* Pure responsive SVG graph for perfect visualization */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  {/* Glowing line gradients */}
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0092ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0092ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Area */}
                <path
                  d="M 10 180 Q 80 120 150 140 T 290 80 T 430 110 T 590 30 L 590 190 L 10 190 Z"
                  fill="url(#chartGlow)"
                  className="transition-all duration-300"
                />

                {/* Primary Stroke Line */}
                <path
                  d="M 10 180 Q 80 120 150 140 T 290 80 T 430 110 T 590 30"
                  fill="none"
                  stroke="#0092ff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Intersect Dots with glowing rings */}
                <circle cx="10" cy="180" r="4.5" fill="#ffffff" stroke="#0092ff" strokeWidth="2.5" />
                <circle cx="150" cy="140" r="4.5" fill="#ffffff" stroke="#0092ff" strokeWidth="2.5" />
                <circle cx="290" cy="80" r="4.5" fill="#ffffff" stroke="#0092ff" strokeWidth="2.5" />
                <circle cx="430" cy="110" r="4.5" fill="#ffffff" stroke="#0092ff" strokeWidth="2.5" />
                <circle cx="590" cy="30" r="4.5" fill="#ffffff" stroke="#0092ff" strokeWidth="2.5" />
              </svg>

              {/* Floating Tooltips or stats overlays */}
              <div className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur-xs text-white p-2 rounded-lg text-[10px] font-bold border border-slate-700 pointer-events-none">
                <span className="text-[#0092ff]">August Peak:</span> $+1,240.50
              </div>

              {/* Month X label tags below */}
              <div className="absolute bottom-2 inset-x-4 flex justify-between text-[9px] font-black text-slate-400 select-none uppercase">
                <span>Jan</span>
                <span>Mar</span>
                <span>May</span>
                <span>Jul</span>
                <span>Sep</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-400 mt-3 text-center">
              * Sales statistics displays real-time aggregated checkout income generated from digital purchases and monthly fan sponsorships.
            </p>
          </div>

          {/* Recent Comments Feed Column */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-left">
            <h3 className="text-xs font-black tracking-widest text-[#ff424d] uppercase mb-1">💬 COMMENTS & COMMUNITY</h3>
            <h4 className="text-lg font-black text-slate-800 mb-4">Instructor Feedback Feed</h4>

            <div className="space-y-4 max-h-[250px] overflow-y-auto scrollbar-thin pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={comment.avatar} 
                      alt={comment.author} 
                      className="w-6 h-6 rounded-full object-cover border border-slate-200" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="leading-none text-left">
                      <span className="text-xs font-black text-slate-850 block">{comment.author}</span>
                      <span className="text-[9px] font-bold text-slate-400">{comment.time}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                    {comment.comment}
                  </p>

                  <div className="flex justify-between items-center mt-1 border-t border-slate-100/60 pt-2 text-[10px]">
                    <span className="text-slate-400 font-extrabold italic truncate max-w-[150px]">
                      {comment.courseTitle}
                    </span>
                    <button
                      onClick={() => setReplyTarget(comment.id)}
                      className="text-[#0092ff] hover:underline font-black cursor-pointer uppercase"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick response form */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <input
                type="text"
                placeholder="Post a generic public notice to support boards..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-slate-50 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCommentText.trim()) {
                    const fresh: FeedComment = {
                      id: `comment-${Date.now()}`,
                      author: 'Your Advisor Portal',
                      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                      comment: newCommentText,
                      time: 'Just now',
                      courseTitle: 'General Announcement'
                    };
                    setComments([fresh, ...comments]);
                    setNewCommentText('');
                    addNotification('📢 Announcement posted to the community noticeboard!');
                  }
                }}
              />
            </div>
          </div>

        </div>

        {/* 6. Lower section lists (Support, Classes, Courses) - Image 4 replication */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Support Tickets */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-left flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black tracking-widest text-[#0092ff] uppercase">🎫 SUPPORT TICKETS</h3>
                <span className="bg-slate-100 text-[10px] text-slate-500 font-black px-2 py-0.5 rounded-full">
                  Recent {tickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border-b border-slate-150 py-2.5 last:border-0 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-slate-800 truncate block max-w-[155px]">{ticket.title}</span>
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${
                        ticket.status === 'Closed' 
                          ? 'bg-slate-100 text-slate-500' 
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Submitted by: {ticket.user}</span>
                      <span>{ticket.date}</span>
                    </div>

                    {ticket.status === 'Pending Reply' && (
                      <button
                        onClick={() => handleResolveTicket(ticket.id)}
                        className="mt-2 text-[#0092ff] hover:underline font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        ✓ Mark Solved & Close
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 mt-4 leading-normal">
              * Support tickets are simulated client-care routing queues. Resolve issue loops directly to protect dojo retention ratios!
            </p>
          </div>

          {/* Recent Live Classes list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-left flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black tracking-widest text-[#0092ff] uppercase">🔴 INLINE LIVE CHANNELS</h3>
                <span className="bg-slate-100 text-[10px] text-slate-500 font-black px-2 py-0.5 rounded-full">Active</span>
              </div>

              <div className="space-y-3">
                {liveClasses.map((cl) => (
                  <div key={cl.id} className="border-b border-slate-150 py-2.5 last:border-0 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-slate-800 truncate block max-w-[155px]">{cl.title}</span>
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${
                        cl.status === 'Live Now' 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-sky-50 text-sky-600'
                      }`}>
                        {cl.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Instructor: {cl.instructor}</span>
                      <span>Target: {cl.date}</span>
                    </div>

                    {cl.status !== 'Live Now' && cl.status !== 'Publish(Finished)' && (
                      <button
                        onClick={() => handleLaunchClass(cl.id)}
                        className="mt-2 text-rose-500 hover:underline font-extrabold text-[10px] uppercase cursor-pointer block"
                      >
                        ▶ Launch Live Roll Stream
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 mt-4 leading-normal">
              * Broadcast server streams live rolling classes directly into client portal accounts.
            </p>
          </div>

          {/* Recent Uploaded Courses list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-left flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black tracking-widest text-[#0092ff] uppercase">📘 ONLINE DIGITAL CATALOG</h3>
                <span className="bg-slate-100 text-[10px] text-slate-500 font-black px-2 py-0.5 rounded-full">
                  {coursesList.length} total
                </span>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-thin">
                {coursesList.map((course) => (
                  <div key={course.id} className="border-b border-slate-150 py-2.5 last:border-0 text-xs flex gap-3">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-150"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-slate-800 block truncate uppercase">{course.title}</span>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-bold">
                        <span>Price: ${course.price.toFixed(2)}</span>
                        <span className="text-indigo-600 font-black">{course.enrollCount} Enrolled</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-400 mt-4 leading-normal">
              * Click "Upload Course" at the top of this dashboard to test adding your own custom video modules or subscription resources!
            </p>
          </div>

        </div>

      </main>

      {/* RENDER DYNAMIC COURSE UPLOADER MODAL */}
      <AnimatePresence>
        {addingCourse && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 overflow-hidden shadow-2xl p-6 text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 uppercase font-display flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#0092ff]" /> Upload Digital Video Masterclass
                </h3>
                <button
                  onClick={() => setAddingCourse(false)}
                  className="text-slate-400 hover:text-slate-800 font-black"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="mt-4 space-y-4">
                
                {/* Course Name */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SPIDER GUARD MASTERY"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full bg-slate-50 text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 uppercase font-black tracking-tight"
                  />
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Standalone Access Price ($)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={newCoursePrice}
                      onChange={(e) => setNewCoursePrice(e.target.value)}
                      className="w-full bg-slate-50 text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-bold"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Combat Genre Category
                    </label>
                    <select
                      value={newCourseCategory}
                      onChange={(e) => setNewCourseCategory(e.target.value as any)}
                      className="w-full bg-slate-50 text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-bold"
                    >
                      <option value="BJJ">BJJ (Grappling)</option>
                      <option value="MMA">MMA (Mixed Combat)</option>
                      <option value="Striking">Striking (Muay Thai / Boxing)</option>
                      <option value="Fitness">Fitness & Kettlebells</option>
                    </select>
                  </div>

                </div>

                {/* Course Description */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Course Description & Syllabus
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a breakdown of the dynamic chapters, grip controls, submissions, and drills taught throughout this masterclass..."
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    className="w-full bg-slate-50 text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-semibold leading-relaxed"
                  />
                </div>

                {/* Submit actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setAddingCourse(false)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    DISCARD
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md shadow-sky-500/10"
                  >
                    CONFIRM & UPLOAD COURSE
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER INLINE FEEDBACK REPLY DIALOG OVERLAY */}
      <AnimatePresence>
        {replyTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 p-6 text-left"
            >
              <h3 className="text-md font-black text-slate-900 leading-tight uppercase font-display">
                Post comment response
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your reply will label as a certified "Dojo Advisor" and load into the log feed.
              </p>

              <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase">Selected Student comment</span>
                <p className="text-xs text-slate-600 font-semibold italic mt-1 leading-relaxed">
                  "{comments.find(c => c.id === replyTarget)?.comment}"
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Your response text
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Thank you Cameron! Glad you enjoyed the details."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-50 text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setReplyTarget(null)}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  DISCARD
                </button>
                <button
                  onClick={() => handlePostCommentReply(replyTarget)}
                  className="w-1/2 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md shadow-sky-600/10"
                >
                  PUBLISH REPLY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
