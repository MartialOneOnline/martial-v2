/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AcademyCourse {
  id: string;
  title: string;
  instructor: {
    name: string;
    avatar: string;
    role: string;
    subscribersCount: number;
  };
  category: 'BJJ' | 'Striking' | 'MMA' | 'Fitness' | 'Weapons';
  description: string;
  price: number;
  isSubscriptionOnly: boolean;
  image: string;
  rating: number;
  enrollCount: number;
  lessonsCount: number;
  durationHours: number;
}

export interface CreatorTier {
  id: string;
  name: string;
  priceMonthly: number;
  badgeColor: string;
  benefits: string[];
  subscribersCount: number;
  description: string;
}

export interface CreatorStats {
  todaySales: number;
  monthSales: number;
  yearSales: number;
  totalSales: number;
  platformIncomeToday: number;
  platformIncomeMonth: number;
  platformIncomeYear: number;
  platformIncomeTotal: number;
  salesCountToday: number;
  salesCountMonth: number;
  salesCountYear: number;
  salesCountTotal: number;
  newSalesCount: number;
  newCommentsCount: number;
  newSupportTicketsCount: number;
  pendingReviewCoursesCount: number;
}

export interface FeedComment {
  id: string;
  author: string;
  avatar: string;
  comment: string;
  time: string;
  courseTitle: string;
  rating?: number;
}

export interface SupportTicket {
  id: string;
  title: string;
  user: string;
  status: 'Pending Reply' | 'Closed' | 'Replied' | 'Waiting';
  date: string;
}

export interface UpcomingLiveClass {
  id: string;
  title: string;
  instructor: string;
  status: 'Draft' | 'Publish(Finished)' | 'Waiting' | 'Live Now';
  date: string;
}
