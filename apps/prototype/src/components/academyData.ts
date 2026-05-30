/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AcademyCourse, CreatorTier, FeedComment, SupportTicket, UpcomingLiveClass } from './academyTypes';

export const INITIAL_COURSES: AcademyCourse[] = [
  {
    id: 'course-1',
    title: 'STRENGTH TRAINING FOR MMA',
    instructor: {
      name: 'Michael Bisping',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role: 'MMA Legend & Head Coach',
      subscribersCount: 840,
    },
    category: 'MMA',
    description: 'Get ready for cage battle with elite sport-science endurance, core explosive power routing, and weight cut protocols.',
    price: 49.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600',
    rating: 4.9,
    enrollCount: 420,
    lessonsCount: 16,
    durationHours: 12.5,
  },
  {
    id: 'course-2',
    title: 'ROGER GRACIE TV - EXCLUSIVE ACCESS',
    instructor: {
      name: 'Roger Gracie',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      role: '10x BJJ World Champion',
      subscribersCount: 3120,
    },
    category: 'BJJ',
    description: 'Master the high-percentage basic submission sequences, posture breakdown systems, and heavy mount control directly from the goat.',
    price: 29.99,
    isSubscriptionOnly: true,
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600',
    rating: 5.0,
    enrollCount: 1280,
    lessonsCount: 45,
    durationHours: 35.0,
  },
  {
    id: 'course-3',
    title: 'ONLINE COURSE - SECRET TECHS',
    instructor: {
      name: 'John Danaher',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      role: 'Master Mind Educator',
      subscribersCount: 2450,
    },
    category: 'BJJ',
    description: 'The complete leglock revolutionary system, front headlock controls, and fundamental escape mechanics explained with extreme detail.',
    price: 89.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600',
    rating: 4.8,
    enrollCount: 890,
    lessonsCount: 22,
    durationHours: 18.0,
  },
  {
    id: 'course-4',
    title: 'MUAY THAI HEAVY BAG WORKOUTS',
    instructor: {
      name: 'Kru Buakaw',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
      role: 'Stadium Champion',
      subscribersCount: 950,
    },
    category: 'Striking',
    description: 'Elite technical heavy bag flows, kicking power building drills, and defensive setups for high impact sparring preparations.',
    price: 19.99,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600',
    rating: 4.7,
    enrollCount: 310,
    lessonsCount: 12,
    durationHours: 8.5,
  },
  {
    id: 'course-5',
    title: 'KETTLEBELL STRENGTH FOR GRAPPLERS',
    instructor: {
      name: 'Jessica Wray',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      role: 'Certified Strength Specialist',
      subscribersCount: 450,
    },
    category: 'Fitness',
    description: 'Functional isometric strength conditioning using nothing but your kettlebell to build neck, core, grip, and hip drive stability.',
    price: 34.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600',
    rating: 4.6,
    enrollCount: 215,
    lessonsCount: 10,
    durationHours: 6.0,
  }
];

export const PATREON_TIERS: CreatorTier[] = [
  {
    id: 'tier-white',
    name: 'White Belt Supporter',
    priceMonthly: 5.00,
    badgeColor: 'border-slate-300 text-slate-700 bg-slate-50',
    benefits: [
      'Access to exclusive weekly blog posts & insights',
      'Early access notifications to new course launches',
      'Custom Patreon Community Forum badge'
    ],
    subscribersCount: 142,
    description: 'Support the channel and get standard community forum access.'
  },
  {
    id: 'tier-purple',
    name: 'Purple Belt Scholar',
    priceMonthly: 15.00,
    badgeColor: 'border-purple-300 text-purple-700 bg-purple-50',
    benefits: [
      'Everything in White Belt Supporter tier',
      'Access to Roger Gracie exclusive technique libraries',
      'Submit questions for monthly Video Q&A sessions',
      '15% discount on all standalone digital masterclasses'
    ],
    subscribersCount: 89,
    description: 'Perfect for intermediate scholars looking to step up their technical understanding.'
  },
  {
    id: 'tier-black',
    name: 'Black Belt Inner Circle',
    priceMonthly: 39.00,
    badgeColor: 'border-amber-300 text-amber-700 bg-amber-50',
    benefits: [
      'Everything in prior subscription tiers',
      '1-on-1 monthly digital video technique analysis (1 submission)',
      'Access to private Discord channel for real-time coaching tips',
      'Exclusive brand apparel item shipped after 3 months of loyalty',
      'Free pass to all upcoming live webinars and stream events'
    ],
    subscribersCount: 37,
    description: 'The ultimate mentorship ecosystem for dedicated martial artists making hyper leaps.'
  }
];

export const INITIAL_FEED_COMMENTS: FeedComment[] = [
  {
    id: 'comment-1',
    author: 'Robert Ransdell',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    comment: 'Thank you for this excellent article. The details on breaking the grip from closed guard are brilliant!',
    time: '4 Mar 2026 | 12:07',
    courseTitle: 'Roger Gracie TV - Submission Sequences',
    rating: 5
  },
  {
    id: 'comment-2',
    author: 'Owosso',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    comment: 'We are very happy that you are satisfied with this course. Will share our side-mount recovery breakdown next week!',
    time: '17 Jul 2026 | 04:18',
    courseTitle: 'Roger Gracie TV',
    rating: 5
  },
  {
    id: 'comment-3',
    author: 'Robert B. Gray',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    comment: 'As I already new a lot on this matter I was surprised that I actually find out that there are more ways to tweak your neck framing and hip control.',
    time: '17 Jul 2026 | 04:08',
    courseTitle: 'Brazilian Jiu Jitsu Techniques',
    rating: 4
  },
  {
    id: 'comment-4',
    author: 'James Kong',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    comment: 'Great video courses that give you the basic knowledge needed to optimize breathing cycles under full mount pressure.',
    time: '14 Jul 2026 | 01:54',
    courseTitle: 'Kettlebell Course',
    rating: 5
  }
];

export const SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-1',
    title: 'Problem with quiz validation in lesson 3',
    user: 'Cameron Schofield',
    status: 'Pending Reply',
    date: 'today'
  },
  {
    id: 'ticket-2',
    title: 'Refund Request #64237',
    user: 'Cameron Schofield',
    status: 'Closed',
    date: 'yesterday'
  },
  {
    id: 'ticket-3',
    title: 'Class delay query regarding Sunday live roll',
    user: 'Light Moon',
    status: 'Replied',
    date: '24 May 2026'
  },
  {
    id: 'ticket-4',
    title: 'Commission Rate question on custom Patreon Tiers',
    user: 'John Wray',
    status: 'Replied',
    date: '21 May 2026'
  }
];

export const UPCOMING_LIVE_CLASSES: UpcomingLiveClass[] = [
  {
    id: 'live-1',
    title: 'Digital Marketing & Dojo Brand Growth',
    instructor: 'Robert Ransdell',
    status: 'Draft',
    date: '29 May 2026'
  },
  {
    id: 'live-2',
    title: 'Boxing Live Class: Speed drills & Footwork',
    instructor: 'Light Moon',
    status: 'Publish(Finished)',
    date: '27 May 2026'
  },
  {
    id: 'live-3',
    title: 'Brazilian Jiu Jitsu Chokes from Mount',
    instructor: 'Roger Gracie',
    status: 'Live Now',
    date: '28 May 2026'
  },
  {
    id: 'live-4',
    title: 'New Course Scorm format test',
    instructor: 'Robert Ransdell',
    status: 'Waiting',
    date: '10 Jun 2026'
  }
];
