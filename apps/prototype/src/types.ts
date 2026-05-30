/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface School {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  stars: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  schoolName: string;
}

export interface FeatureItem {
  icon: string; // lucide-react icon names
  title: string;
  description?: string;
}

export const NAV_LINKS = [
  { label: 'Explore', href: '#schools' },
  { label: 'Technology', href: '#technology' },
  { label: 'Dashboard', href: '#academies' },
  { label: 'Academy', href: '#learning' },
];

export const APP_FEATURES_TICKS = [
  'Manage and control their business in the cloud.',
  'Receive payments, Upload content.',
  'A great experience of the user\'s martial arts journey.',
  'Connect with student on a deeper level.',
  'Multilingual solution.',
];

export const FOR_MEMBERS_FEATURES: FeatureItem[] = [
  { icon: 'Megaphone', title: 'Send promotional messages to customers & members of your club' },
  { icon: 'Gauge', title: 'Tracking member progress & attendance' },
  { icon: 'MessageSquareChannel', title: 'Communicate directly with members' },
  { icon: 'CalendarDays', title: 'Set classed schedules and events' },
  { icon: 'MapPin', title: 'Show addressed & directions' },
  { icon: 'Receipt', title: 'Bill membership fees.' },
  { icon: 'Music4', title: 'Links to news, music podcast, & other.' },
];

export const FOR_ACADEMIES_FEATURES: FeatureItem[] = [
  { icon: 'Megaphone', title: 'Send promotional messages to customers & members of your club' },
  { icon: 'Gauge', title: 'Tracking member progress & attendance' },
  { icon: 'MessageSquareChannel', title: 'Communicate directly with members' },
  { icon: 'CalendarDays', title: 'Set classed schedules and events' },
  { icon: 'MapPin', title: 'Show addressed & directions' },
  { icon: 'Receipt', title: 'Bill membership fees.' },
  { icon: 'Music4', title: 'Links to news, music podcast, & other.' },
];

export const FEATURED_SCHOOLS: School[] = [
  {
    id: 'school-1',
    name: 'Apex Martial Arts Academy',
    location: 'Hutton, United Kingdom',
    rating: 4.6,
    reviewCount: 780,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800',
    description: 'Nunc vulputate libero et velit interdum, ac aliquet odio mattis. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    stars: 5,
  },
  {
    id: 'school-2',
    name: 'Valor Taekwondo Centre',
    location: 'Hutton, United Kingdom',
    rating: 4.8,
    reviewCount: 420,
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=800',
    description: 'Ac aliquet odio mattis. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    stars: 5,
  },
  {
    id: 'school-3',
    name: 'Haven Jiu-Jitsu Club',
    location: 'London, United Kingdom',
    rating: 4.9,
    reviewCount: 910,
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=800',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio.',
    stars: 5,
  },
  {
    id: 'school-4',
    name: 'Alpha Boxing Gym',
    location: 'Manchester, United Kingdom',
    rating: 4.7,
    reviewCount: 310,
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=800',
    description: 'Nunc vulputate libero et velit interdum, ac aliquet odio mattis. Aliquam feugiat feugiat rhoncus integer.',
    stars: 5,
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'David Jenkins',
    role: 'Chief Instructor',
    rating: 4.8,
    quote: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.',
    schoolName: 'Apex Martial Arts Academy',
  },
  {
    id: 't-2',
    name: 'Sarah Kowalski',
    role: 'Academy Owner',
    rating: 4.9,
    quote: 'Nunc vulputate libero et velit interdum, ac aliquet odio mattis. Perfect online portal that completely automated our memberships.',
    schoolName: 'Haven Jiu-Jitsu Club',
  },
  {
    id: 't-3',
    name: 'Marcus Sterling',
    role: 'Academy Owner',
    rating: 4.7,
    quote: 'Excellent features! The messaging system and schedule tracker have been game changers for our student re-enrollment rates.',
    schoolName: 'Valor Taekwondo Centre',
  },
];

export const BRAND_LOGOS = [
  { name: 'Apex Elite', icon: 'shield' },
  { name: 'Dragon Fist', icon: 'dragon' },
  { name: 'Martial Way', icon: 'sword' },
  { name: 'Crest Dojo', icon: 'crest' },
  { name: 'Tiger Strike', icon: 'tiger' },
  { name: 'Yin Yang Budo', icon: 'yinyang' },
  { name: 'Shogun Club', icon: 'shogun' },
  { name: 'Championship Karate', icon: 'trophy' },
  { name: 'Satori Arts', icon: 'lotus' },
];
