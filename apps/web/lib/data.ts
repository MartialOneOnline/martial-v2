export interface School {
  id: string
  name: string
  location: string
  rating: number
  reviewCount: number
  image: string
  description: string
}

export const FEATURED_SCHOOLS: School[] = [
  {
    id: 'school-1',
    name: 'Roger Gracie Malaga',
    location: 'Málaga, Spain',
    rating: 4.9,
    reviewCount: 780,
    image: '/roger-gracie-malaga.jpg',
    description: "World-class Brazilian Jiu-Jitsu academy under Roger Gracie's lineage. Training champions and passionate practitioners at every level.",
  },
  {
    id: 'school-2',
    name: 'Rafael Pousada Jiu-Jitsu',
    location: 'Jerez de la Frontera, Spain',
    rating: 4.8,
    reviewCount: 420,
    image: '/rafael-pousada-jiu-jitsu.jpg',
    description: 'Equipo de Jiu-Jitsu Brasileño. Defensa Personal y Entrenamiento personal. Profesor Rafael Pousada.',
  },
  {
    id: 'school-3',
    name: 'Carlson Gracie Jiu-Jitsu Peniche',
    location: 'Peniche, Portugal',
    rating: 4.8,
    reviewCount: 560,
    image: '/carlson-peniche.png',
    description: 'Escola de Jiu Jitsu em Peniche, Portugal. Carlson Gracie Jiu Jitsu Peniche. Adultos, mulheres e crianças. Professor Alex Pereira.',
  },
  {
    id: 'school-4',
    name: 'Mathouse BJJ Reading',
    location: 'Reading, United Kingdom',
    rating: 4.9,
    reviewCount: 910,
    image: '/mathouse.jpg',
    description: 'Mathouse is a Brazilian Jiu-Jitsu Academy in Reading. We offer Adults and Kids Brazilian Jiu-Jitsu Classes and Adults NO-GI Classes.',
  },
]

export const ALL_SCHOOLS: School[] = [
  ...FEATURED_SCHOOLS,
  {
    id: 'school-5',
    name: 'Five Elements Jiu-Jitsu',
    location: 'Lisboa, Portugal',
    rating: 4.7,
    reviewCount: 310,
    image: '/five-elements-jiu-jitsu.jpg',
    description: 'Academia de Jiu-Jitsu Brasileiro em Lisboa. Programas para adultos, crianças e self-defense. Equipa competitiva activa.',
  },
  {
    id: 'school-6',
    name: 'Centro de Karate Mangualde',
    location: 'Mangualde, Portugal',
    rating: 4.6,
    reviewCount: 180,
    image: '/centro-karate-mangualde.jpg',
    description: 'Traditional Karate academy with over 20 years of history. Shotokan and Kyokushin programs for all ages.',
  },
  {
    id: 'school-7',
    name: 'Roger Gracie Dubai',
    location: 'Dubai, UAE',
    rating: 4.9,
    reviewCount: 650,
    image: '/roger-gracie-dubai.jpg',
    description: 'Official Roger Gracie Academy in Dubai. World-class BJJ instruction in a state-of-the-art facility.',
  },
  {
    id: 'school-8',
    name: 'Sanlucar Jiu-Jitsu',
    location: 'Sanlúcar de Barrameda, Spain',
    rating: 4.7,
    reviewCount: 220,
    image: '/sanlucar-jiu-jitsu.jpg',
    description: 'Brazilian Jiu-Jitsu academy in the heart of Andalusia. Friendly environment for beginners and advanced practitioners.',
  },
]

export const DISCIPLINES = [
  'All',
  'Brazilian Jiu-Jitsu',
  'Karate',
  'Muay Thai',
  'Wrestling',
  'Judo',
  'MMA',
  'Boxing',
  'Self Defence',
  'Kids Classes',
]

export const PARTNER_LOGOS = [
  { id: 1, name: 'Gracie Barra',    img: '/logo-gracie-barra.png' },
  { id: 2, name: 'Roger Gracie',    img: '/logo-roger-gracie.png' },
  { id: 3, name: 'Alliance BJJ',    img: '/logo-alliance.png' },
  { id: 4, name: 'Carlson Gracie',  img: '/logo-carlson-gracie.png' },
  { id: 5, name: 'Renzo Gracie',    img: '/logo-renzo-gracie.png' },
  { id: 6, name: 'Gracie Humaita',  img: '/logo-gracie-humaita.png' },
  { id: 7, name: 'Leo Galati',      img: '/logo-leogalati.png' },
  { id: 8, name: 'Nova União',      img: '/logo-nova-uniao.png' },
  { id: 9, name: 'Yogui BJJ Spain', img: '/logo-yogui-bjj-spain.png' },
]
