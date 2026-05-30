/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Star, Filter, LayoutGrid, ListFilter, Compass, Sparkles, Building2, Eye, Clock } from 'lucide-react';

interface ExploreAcademy {
  id: string;
  name: string;
  location: string;
  coordinates: { x: number; y: number }; // Percentage offsets on map background
  rating: number;
  tags: string[];
  description: string;
  image: string;
}

const EXPLORE_ACADEMIES: ExploreAcademy[] = [
  {
    id: 'roger-gracie-malaga',
    name: 'Roger Gracie Malaga',
    location: 'Calle Polifemo, 3, Málaga, España',
    coordinates: { x: 44.5, y: 76.5 },
    rating: 4.9,
    tags: ['JIU JITSU', 'GRAPPLING'],
    description: 'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles. Filial de la prestigiosa Roger Gracie Academy.',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'rafael-pousada-jiu-jitsu',
    name: 'Rafael Pousada Jiu Jitsu',
    location: 'Calle Esla 13, 11405, Jerez de la Frontera, España',
    coordinates: { x: 40.2, y: 77.8 },
    rating: 4.8,
    tags: ['MMA', 'JUDO', 'GRAPPLING'],
    description: 'Equipo de Jiu Jitsu Brasileño. Defensa Personal y Entrenamiento personal. Profesor Rafael Pousada.',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'mathouse-bjj-reading',
    name: 'Mathouse - Brazilian Jiu Jitsu Academy Reading',
    location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading, Reino Unido',
    coordinates: { x: 38.5, y: 22.0 },
    rating: 4.9,
    tags: ['JIU JITSU', 'JUDO', 'WRESTLING'],
    description: 'Mathouse is a Brazilian Jiu-Jitsu Academy in Reading. We offer Adults and Kids Brazilian Jiu Jitsu Classes and Adults NO-GI Classes.',
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'carlson-gracie-peniche',
    name: 'Carlson Gracie Jiu Jitsu Peniche',
    location: 'Rua Luís de Camões Peniche, 2525-351, Atouguia da Baleia, Portugal',
    coordinates: { x: 26.5, y: 71.0 },
    rating: 4.8,
    tags: ['JIU JITSU', 'JUDO', 'WRESTLING'],
    description: 'Escola de Jiu Jitsu em Peniche, Portugal. Carlson Gracie Jiu Jitsu Peniche. Adultos, mulheres e crianças. Professor Alex Pereira.',
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'five-elements-jiu-jitsu',
    name: 'Five Elements Jiu Jitsu Huelva',
    location: 'Calle Teide 6 Spain, 21002, Huelva, España',
    coordinates: { x: 36.8, y: 75.4 },
    rating: 4.7,
    tags: ['MMA', 'JIU JITSU', 'JUDO'],
    description: 'Descubre las arte marciales más emocionantes en un ambiente acogedor y profesional. En Five Elements Jiu-Jitsu Huelva creemos en la importancia del compañerismo.',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'bjj-sanlucar',
    name: 'Jiu-Jitsu Brasileño Sanlucar De Barrameda',
    location: 'C. Huerta de la Balsa 2 Cád, 11540, Sanlúcar de Barrameda, España',
    coordinates: { x: 38.3, y: 79.2 },
    rating: 4.6,
    tags: ['JIU JITSU', 'GRAPPLING', 'BRAZILIAN JIU JITSU'],
    description: 'Clases diarias de BJJ Gi y No-Gi en Sanlúcar de Barrameda. Profesorado cualificado y ambiente idóneo de entrenamiento.',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'roger-gracie-dubai',
    name: 'Roger Gracie Dubai Academy',
    location: 'The Forge Gym DXB, Dubai, Emiratos Árabes Unidos',
    coordinates: { x: 80.5, y: 65.0 },
    rating: 4.9,
    tags: ['MMA', 'MUAY THAI', 'FITNESS'],
    description: 'World Class Boutique Martial Arts MMA training including Roger Gracie Jiu Jitsu at The Forge Gym DXB. API Business Suites.',
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'karate-mangualde',
    name: 'Centro De Karaté De Mangualde',
    location: '3530, Mangualde, Portugal',
    coordinates: { x: 28.5, y: 64.2 },
    rating: 4.7,
    tags: ['JIU JITSU', 'KARATE'],
    description: 'Centro Bujutsu de Mangualde - Artes Marciais para todos interessados desde os 4 anos de idade.',
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600'
  }
];

export interface ExploreClass {
  id: string;
  className: string;
  schoolId: string;
  schoolName: string;
  discipline: string;
  level: string;
  instructor: string;
  time: string;
  days: string;
  location: string;
  coordinates: { x: number; y: number };
  image: string;
  rating: number;
}

export const EXPLORE_CLASSES: ExploreClass[] = [
  {
    id: 'rg-malaga-bjj-beginners',
    className: 'BJJ Beginners (Gi)',
    schoolId: 'roger-gracie-malaga',
    schoolName: 'Roger Gracie Malaga',
    discipline: 'JIU JITSU',
    level: 'Beginner',
    instructor: 'RGM Coach Team',
    time: '18:00 - 19:15',
    days: 'Mon, Wed, Fri',
    location: 'Calle Polifemo, 3, Málaga, España',
    coordinates: { x: 44.5, y: 76.5 },
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600',
    rating: 4.9
  },
  {
    id: 'rg-malaga-grappling-advanced',
    className: 'No-Gi Grappling (Pro)',
    schoolId: 'roger-gracie-malaga',
    schoolName: 'Roger Gracie Malaga',
    discipline: 'GRAPPLING',
    level: 'Advanced',
    instructor: 'Black Belt Head Coach',
    time: '19:30 - 21:00',
    days: 'Tue, Thu',
    location: 'Calle Polifemo, 3, Málaga, España',
    coordinates: { x: 44.5, y: 76.5 },
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600',
    rating: 4.8
  },
  {
    id: 'rp-bjj-self-defense',
    className: 'Brazilian Jiu Jitsu & Self-Defense',
    schoolId: 'rafael-pousada-jiu-jitsu',
    schoolName: 'Rafael Pousada Jiu Jitsu',
    discipline: 'JIU JITSU',
    level: 'All Levels',
    instructor: 'Rafael Pousada',
    time: '10:00 - 11:30',
    days: 'Mon, Wed',
    location: 'Calle Esla 13, 11405, Jerez de la Frontera, España',
    coordinates: { x: 40.2, y: 77.8 },
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600',
    rating: 4.9
  },
  {
    id: 'rp-grappling-sparring',
    className: 'Grappling & Sparring Drill',
    schoolId: 'rafael-pousada-jiu-jitsu',
    schoolName: 'Rafael Pousada Jiu Jitsu',
    discipline: 'GRAPPLING',
    level: 'Advanced',
    instructor: 'Rafael Pousada',
    time: '20:00 - 21:30',
    days: 'Tue, Thu',
    location: 'Calle Esla 13, 11405, Jerez de la Frontera, España',
    coordinates: { x: 40.2, y: 77.8 },
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600',
    rating: 4.8
  },
  {
    id: 'mh-bjj-kids',
    className: 'Kids Jiu Jitsu BJJ Class',
    schoolId: 'mathouse-bjj-reading',
    schoolName: 'Mathouse - Brazilian Jiu Jitsu Academy Reading',
    discipline: 'JIU JITSU',
    level: 'Kids',
    instructor: 'Coach Mathouse Team',
    time: '16:30 - 17:30',
    days: 'Mon, Wed, Fri',
    location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading, Reino Unido',
    coordinates: { x: 38.5, y: 22.0 },
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600',
    rating: 4.9
  },
  {
    id: 'cg-bjj-adults',
    className: 'Adults Carlson Gracie BJJ',
    schoolId: 'carlson-gracie-peniche',
    schoolName: 'Carlson Gracie Jiu Jitsu Peniche',
    discipline: 'JIU JITSU',
    level: 'All Levels',
    instructor: 'Alex Pereira',
    time: '19:00 - 20:30',
    days: 'Mon, Tue, Wed, Thu, Fri',
    location: 'Rua Luís de Camões Peniche, 2525-351, Atouguia da Baleia, Portugal',
    coordinates: { x: 26.5, y: 71.0 },
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600',
    rating: 4.8
  },
  {
    id: 'fe-mma-striking',
    className: 'MMA Striking & Stand-up',
    schoolId: 'five-elements-jiu-jitsu',
    schoolName: 'Five Elements Jiu Jitsu Huelva',
    discipline: 'MMA',
    level: 'All Levels',
    instructor: 'Five Elements Staff',
    time: '19:00 - 20:15',
    days: 'Tue, Thu',
    location: 'Calle Teide 6 Spain, 21002, Huelva, España',
    coordinates: { x: 36.8, y: 75.4 },
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600',
    rating: 4.7
  },
  {
    id: 'rgd-muay-thai',
    className: 'Muay Thai Kickboxing Advanced',
    schoolId: 'roger-gracie-dubai',
    schoolName: 'Roger Gracie Dubai Academy',
    discipline: 'MUAY THAI',
    level: 'Advanced',
    instructor: 'Kru Pro Team',
    time: '18:35 - 19:45',
    days: 'Mon, Wed, Fri',
    location: 'The Forge Gym DXB, Dubai, Emiratos Árabes Unidos',
    coordinates: { x: 80.5, y: 65.0 },
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600',
    rating: 4.9
  },
  {
    id: 'km-judo',
    className: 'Traditional Judo Practice',
    schoolId: 'karate-mangualde',
    schoolName: 'Centro De Karaté De Mangualde',
    discipline: 'JUDO',
    level: 'All Levels',
    instructor: 'Bujutsu Sensei',
    time: '17:00 - 18:30',
    days: 'Tue, Fri',
    location: '3530, Mangualde, Portugal',
    coordinates: { x: 28.5, y: 64.2 },
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600',
    rating: 4.7
  }
];

interface ExploreDatabaseProps {
  onSelectSchool: (schoolId: string) => void;
}

export default function ExploreDatabase({ onSelectSchool }: ExploreDatabaseProps) {
  const [toggleMode, setToggleMode] = useState<'schools' | 'classes'>('schools');
  const [searchWhat, setSearchWhat] = useState('');
  const [searchWhere, setSearchWhere] = useState('');
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredSchools = EXPLORE_ACADEMIES.filter((school) => {
    const matchesDiscipline = !searchWhat.trim() ||
      school.name.toLowerCase().includes(searchWhat.toLowerCase()) ||
      school.tags.some((t) => t.toLowerCase().includes(searchWhat.toLowerCase())) ||
      school.description.toLowerCase().includes(searchWhat.toLowerCase());
    
    const matchesLocation = !searchWhere.trim() ||
      school.location.toLowerCase().includes(searchWhere.toLowerCase());

    return matchesDiscipline && matchesLocation;
  });

  const filteredClasses = EXPLORE_CLASSES.filter((cls) => {
    const matchesDiscipline = !searchWhat.trim() ||
      cls.className.toLowerCase().includes(searchWhat.toLowerCase()) ||
      cls.discipline.toLowerCase().includes(searchWhat.toLowerCase()) ||
      cls.schoolName.toLowerCase().includes(searchWhat.toLowerCase());

    const matchesLocation = !searchWhere.trim() ||
      cls.location.toLowerCase().includes(searchWhere.toLowerCase());

    return matchesDiscipline && matchesLocation;
  });

  const mapSchools = toggleMode === 'schools'
    ? filteredSchools
    : EXPLORE_ACADEMIES.filter((school) =>
        filteredClasses.some((cls) => cls.schoolId === school.id)
      );

  return (
    <div className="bg-slate-50 min-h-screen" id="explore-database-view">
      
      {/* 1. Immersive Header Banner matching image 2 */}
      <div className="relative h-[250px] sm:h-[300px] bg-slate-950 flex flex-col items-center justify-center text-center px-4 overflow-hidden" id="explore-banner">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=1600"
            alt="Fighters bowing in kimono"
            className="w-full h-full object-cover opacity-20 filter grayscale"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />
        </div>

        <div className="relative z-10 space-y-4 max-w-4xl" id="explore-banner-headings">
          <span className="text-[10px] uppercase font-black text-[#0092ff] tracking-[0.2em] inline-flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-sky-400" />
            Global Combat Network
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight uppercase tracking-wider font-display">
            Discover a World <br className="sm:hidden" />
            <span className="text-slate-400">Of Martial Arts Experiences</span>
          </h1>
        </div>
      </div>

      {/* 2. Floating Search and Toggle Bars System */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 sm:-mt-12 relative z-20" id="search-float-system">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5 max-w-5xl mx-auto space-y-4">
          
          {/* Main search and inputs block */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3" id="input-fields-row">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-3.5 border rounded-xl cursor-pointer transition-all gap-2 font-sans text-xs font-black uppercase tracking-wider ${
                showFilters 
                  ? 'bg-sky-50 text-[#0092ff] border-sky-300 ring-1 ring-sky-200' 
                  : 'bg-slate-50 text-slate-500 border-gray-200 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Toggle Advanced Filters"
              id="filter-toggle-btn"
            >
              <ListFilter className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Filters</span>
              {searchWhere && (
                <span className="w-2 h-2 rounded-full bg-[#0092ff] animate-pulse" />
              )}
            </button>

            {/* Main Clean Search Bar Input */}
            <div className="relative w-full md:flex-1" id="main-clean-search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={searchWhat}
                onChange={(e) => setSearchWhat(e.target.value)}
                placeholder="Search by discipline, academy name, or coach (e.g., Jiu Jitsu, Gracie, Malaga)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0092ff] focus:ring-2 focus:ring-sky-100 transition-all font-sans"
              />
            </div>

            {/* Search Button */}
            <button
               onClick={() => {}}
               className="w-full md:w-auto px-8 py-3.5 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 active:scale-98 transition-all cursor-pointer font-sans"
            >
              Search
            </button>
          </div>

          {/* Collapsible Advanced Filters Section */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden border-t border-slate-100 pt-4 space-y-4"
                id="collapsible-filters-drawer"
              >
                {/* Location Option - Filter by location */}
                <div className="relative w-full" id="filter-location-wrapper">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#0092ff] uppercase tracking-widest pointer-events-none">Where?</span>
                  <input
                    type="text"
                    value={searchWhere}
                    onChange={(e) => setSearchWhere(e.target.value)}
                    placeholder="Filter by city, zipcode, or country (e.g., Malaga, Reading)..."
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0092ff] focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                  />
                </div>

                {/* Popular Presets Filter Chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1" id="presets-drawer-grid">
                  <div className="space-y-1.5 w-full font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Popular Disciplines:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['JIU JITSU', 'MMA', 'GRAPPLING', 'MUAY THAI', 'KARATE', 'JUDO'].map((disc) => (
                        <button
                          key={disc}
                          onClick={() => {
                            if (searchWhat.toUpperCase() === disc.toUpperCase()) {
                              setSearchWhat('');
                            } else {
                              setSearchWhat(disc);
                            }
                          }}
                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all hover:scale-[1.02] cursor-pointer border ${
                            searchWhat.toUpperCase() === disc.toUpperCase()
                              ? 'bg-sky-50 text-[#0092ff] border-sky-300 shadow-xs ring-1 ring-sky-200'
                              : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          {disc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 w-full font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Popular Locations:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Málaga', 'Reading', 'Peniche', 'Huelva', 'Dubai'].map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            if (searchWhere.toLowerCase() === loc.toLowerCase()) {
                              setSearchWhere('');
                            } else {
                              setSearchWhere(loc);
                            }
                          }}
                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all hover:scale-[1.02] cursor-pointer border ${
                            searchWhere.toLowerCase() === loc.toLowerCase()
                              ? 'bg-sky-50 text-[#0092ff] border-sky-300 shadow-xs ring-1 ring-sky-200'
                              : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button Bars: Schools vs Classes */}
          <div className="flex justify-center" id="schools-classes-toggle-wrapper">
            <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner gap-1" id="schools-toggle-frame">
              <button
                onClick={() => setToggleMode('schools')}
                className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  toggleMode === 'schools' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Schools
              </button>
              <button
                onClick={() => setToggleMode('classes')}
                className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  toggleMode === 'classes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Classes
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Main Split View Pane Component */}
      <div className="max-w-7xl mx-auto px-4 py-10" id="main-split-container">
        <div className="grid lg:grid-cols-12 gap-8 items-start" id="split-layout-grid">
          
          {/* Left Pane: Interactive Listing Scroll Area (7/12 width) */}
          <div className="lg:col-span-7 col-span-1 space-y-4" id="listings-scroll-lane">
            
            <div className="flex flex-wrap items-center justify-between px-2 mb-2 gap-2" id="results-meta">
              <div className="flex items-center flex-wrap gap-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {toggleMode === 'schools' 
                    ? `Showing ${filteredSchools.length} academies found` 
                    : `Showing ${filteredClasses.length} classes found`
                  }
                </p>
                {(searchWhat || searchWhere) && (
                  <button
                    onClick={() => {
                      setSearchWhat('');
                      setSearchWhere('');
                    }}
                    className="text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100/80 px-2 py-0.5 rounded-md"
                  >
                    Clear Filters ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 cursor-pointer hover:underline">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Show nearest dojos</span>
              </div>
            </div>

            <div className="space-y-4" id="schools-list-container">
              {toggleMode === 'schools' ? (
                <>
                  {filteredSchools.map((school) => {
                    const isHovered = hoveredSchoolId === school.id;
                    const isSelectedPin = selectedPinId === school.id;

                    return (
                      <motion.div
                        key={school.id}
                        layoutId={`explore-card-${school.id}`}
                        onMouseEnter={() => setHoveredSchoolId(school.id)}
                        onMouseLeave={() => setHoveredSchoolId(null)}
                        onClick={() => {
                          setSelectedPinId(school.id);
                          onSelectSchool(school.id);
                        }}
                        className={`cursor-pointer border text-left p-4 sm:p-5 rounded-2xl bg-white flex flex-col sm:flex-row gap-5 transition-all relative overflow-hidden group ${
                          isSelectedPin || isHovered 
                            ? 'border-[#0092ff] shadow-md shadow-sky-500/5' 
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Visual Media Cover Banner */}
                        <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                          <img
                            src={school.image}
                            alt={school.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {school.rating >= 4.8 && (
                            <span className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md text-[8px] font-black tracking-widest text-[#0092ff] px-2 py-0.5 rounded-md uppercase">
                              Elite Class
                            </span>
                          )}
                        </div>

                        {/* Academy Description & Info Columns */}
                        <div className="flex-1 flex flex-col justify-between" id="card-inner-info">
                          <div className="space-y-2">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5" id="card-tags">
                              {school.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 tracking-wider"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Title Headings */}
                            <div>
                              <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#0092ff] transition-colors">
                                {school.name}
                              </h3>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 leading-tight">
                                <MapPin className="w-3 h-3 text-[#0092ff] flex-shrink-0" />
                                <span className="truncate max-w-[280px]">{school.location}</span>
                              </p>
                            </div>

                            {/* Short Description text */}
                            <p className="text-slate-600 text-[11.5px] leading-relaxed font-semibold line-clamp-2">
                              {school.description}
                            </p>
                          </div>

                          {/* Card Lower Indicators */}
                          <div className="pt-3 border-t border-slate-50 mt-3 flex items-center justify-between" id="card-footer-row">
                            <div className="flex items-center gap-1.5" id="card-stars">
                              <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black text-amber-700 ml-1 mt-0.5 leading-none">{school.rating}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verificado</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-[11px] font-black text-[#0092ff] uppercase group-hover:translate-x-1 transition-transform">
                              <span>View Public Page</span>
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredSchools.length === 0 && (
                    <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl" id="empty-state-card">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-base font-black text-slate-800">No Academies Found</h3>
                      <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1">
                        Try entering different tags or modifying your location search query parameters.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {filteredClasses.map((cls) => {
                    const isHovered = hoveredSchoolId === cls.schoolId;
                    const isSelectedPin = selectedPinId === cls.schoolId;

                    return (
                      <motion.div
                        key={cls.id}
                        layoutId={`explore-card-${cls.id}`}
                        onMouseEnter={() => setHoveredSchoolId(cls.schoolId)}
                        onMouseLeave={() => setHoveredSchoolId(null)}
                        onClick={() => {
                          setSelectedPinId(cls.schoolId);
                          onSelectSchool(cls.schoolId);
                        }}
                        className={`cursor-pointer border text-left p-4 sm:p-5 rounded-2xl bg-white flex flex-col sm:flex-row gap-5 transition-all relative overflow-hidden group ${
                          isSelectedPin || isHovered 
                            ? 'border-[#0092ff] shadow-md shadow-sky-500/5' 
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Visual Media Cover Banner */}
                        <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                          <img
                            src={cls.image}
                            alt={cls.className}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md text-[8px] font-black tracking-widest text-[#0092ff] px-2 py-0.5 rounded-md uppercase">
                            {cls.discipline}
                          </span>
                        </div>

                        {/* Class Info Columns */}
                        <div className="flex-1 flex flex-col justify-between" id="class-inner-info">
                          <div className="space-y-2">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5" id="class-tags-row">
                              <span className="text-[9px] font-black bg-[#0092ff]/10 text-[#0092ff] px-2 py-0.5 rounded-full border border-sky-200/40 tracking-wider">
                                {cls.discipline}
                              </span>
                              <span className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 tracking-wider">
                                {cls.level}
                              </span>
                            </div>

                            {/* Title Headings */}
                            <div>
                              <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#0092ff] transition-colors">
                                {cls.className}
                              </h3>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                Offered by: <span className="text-slate-700 font-extrabold">{cls.schoolName}</span>
                              </p>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 leading-tight">
                                <MapPin className="w-3 h-3 text-[#0092ff] flex-shrink-0" />
                                <span className="truncate max-w-[280px]">{cls.location}</span>
                              </p>
                            </div>

                            {/* Instructor & Schedule details */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] font-semibold text-slate-600">
                              <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Instructor</span>
                                <span className="font-extrabold text-slate-700">{cls.instructor}</span>
                              </div>
                              <div className="hidden sm:block w-px h-6 bg-slate-100" />
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-sky-500 mr-0.5" />
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Schedule</span>
                                  <span className="font-extrabold text-[#0092ff]">{cls.days} • {cls.time}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Lower Indicators */}
                          <div className="pt-3 border-t border-slate-50 mt-3 flex items-center justify-between" id="class-footer-row">
                            <div className="flex items-center gap-1.5" id="class-stars">
                              <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black text-amber-700 ml-1 mt-0.5 leading-none">{cls.rating}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{cls.level} Class</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-[11px] font-black text-[#0092ff] uppercase group-hover:translate-x-1 transition-transform">
                              <span>Book Class & Info</span>
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredClasses.length === 0 && (
                    <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl" id="empty-state-card">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-base font-black text-slate-800">No Classes Found</h3>
                      <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1">
                        Try entering different tags or modifying your location search query parameters.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

          {/* Right Pane: Sticky Immersive Map View (5/12 width) */}
          <div className="lg:col-span-5 h-[400px] lg:h-[650px] sticky top-28 rounded-3xl overflow-hidden border border-slate-200/60 shadow-xl bg-slate-900 flex flex-col" id="sticky-map-lane">
            
            {/* Map Header System */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 relative z-30" id="map-header">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase">Live Coverage Terminal</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">MÁLAGA - LONDON - DUBAI</span>
            </div>

            {/* Immersive World/Med Map Canvas matching image 2 style */}
            <div className="flex-1 relative overflow-hidden" id="interactive-map-canvas">
              {/* Slate/Teal World Vector Map Simulation Background */}
              <div className="absolute inset-0 z-0 bg-[#c4ebf6]">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1400"
                  alt="Stunning topographic vector lines"
                  className="w-full h-full object-cover opacity-15 filter invert saturate-150"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual grid line overlays */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2942]/90 via-[#1e4860]/45 to-[#0b2839]/80 mix-blend-color" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
              </div>

              {/* Red Map coordinates Pins Rendering matching image 2 */}
              {mapSchools.map((school) => {
                const isHovered = hoveredSchoolId === school.id;
                const isSelected = selectedPinId === school.id;

                return (
                  <motion.div
                    key={school.id}
                    className="absolute cursor-pointer z-10"
                    style={{ left: `${school.coordinates.x}%`, top: `${school.coordinates.y}%` }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => {
                      setSelectedPinId(school.id);
                      setHoveredSchoolId(school.id);
                    }}
                    id={`map-pin-${school.id}`}
                  >
                    
                    {/* Pulsing signal halo */}
                    <span className={`absolute -inset-3 rounded-full animate-ping opacity-40 bg-rose-500 pointer-events-none ${
                      isSelected || isHovered ? 'inline-block' : 'hidden'
                    }`} />

                    {/* Red Marker block */}
                    <div className="relative group/pin">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                        isSelected || isHovered 
                          ? 'bg-rose-500 scale-110 border-2 border-white' 
                          : 'bg-[#0092ff] border-2 border-white'
                      }`}>
                        <span className="text-[11px] font-black text-white font-mono leading-none">
                          M
                        </span>
                      </div>

                      {/* Map Tooltip Banner */}
                      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white border border-slate-800 rounded-xl p-2.5 w-44 shadow-2xl transition-all pointer-events-none ${
                        isSelected || isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}>
                        <p className="text-[10px] font-black truncate leading-tight">{school.name}</p>
                        <p className="text-[8px] text-[#0092ff] font-bold mt-0.5 truncate">{school.location}</p>
                        <div className="flex items-center gap-1 mt-1 text-[8px] text-amber-400">
                          <Star className="w-2 h-2 fill-current" />
                          <span className="font-mono mt-0.5">{school.rating} Verified</span>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })}

              {/* Custom SVG Ocean Label Decorators */}
              <div className="absolute right-12 top-1/3 text-white/20 select-none pointer-events-none font-black tracking-widest text-[13px] uppercase font-mono [writing-mode:vertical-lr] rotate-180">
                Océano Ártico
              </div>
              <div className="absolute left-1/3 bottom-12 text-white/25 select-none pointer-events-none font-black tracking-widest text-[14px] uppercase font-mono">
                Atlántico Norte
              </div>

            </div>

            {/* Simulated Live status bar footer */}
            <div className="bg-slate-950 p-3.5 border-t border-slate-800 text-[10px] text-slate-400 font-bold flex items-center justify-between" id="map-status-bar">
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span>Synchronizing node markers...</span>
              </span>
              <span>UTC • ONLINE</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
