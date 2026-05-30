/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'es' | 'pt' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Navigation
    'nav.home': 'HOME',
    'nav.schools': 'EXPLORE',
    'nav.martial_online': 'ACADEMY',
    'nav.instructor_hub': 'DASHBOARD',
    'nav.technology': 'TECHNOLOGY',
    'nav.price': 'PRICE',
    'nav.dashboard': 'DASHBOARD',
    'nav.logout': 'LOGOUT',
    'nav.logout_success': 'Logout successful! Your session has been safely reset.',
    'nav.tagline': 'TAKE CONTROL',
    'nav.wallet_label': 'Your Wallet:',

    // Hero Section
    'hero.badge': '★ INTEGRATED FIGHT PLATFORM FOR ACADEMIES',
    'hero.title_part1': 'DOJO MANAGEMENT',
    'hero.title_part2': 'MADE SIMPLE & AUTOMATED',
    'hero.desc': 'Empower your instructors, grow members, track certifications & payments with bespoke fighter-centric software templates.',
    'hero.btn_map': 'FIND LOCAL ACADEMIES',
    'hero.btn_creators': 'INSTRUCTOR PATREON CREATOR',
    'hero.active_students': 'Active students globally connected',
    'hero.verified_dojos': 'Verified champion academies',

    // Features / Technology
    'features.badge': '⚡ HOW IT WORKS',
    'features.title': 'Cloud Operations Explicitly Built For Combat Sports',
    'features.desc': 'Automate class schedules, student grading, secure payments and digital learning pipelines with modern modular modules.',
    'features.box1_title': 'Fast Payment Solutions',
    'features.box1_desc': 'Collect membership dues via card, Apple Pay, Google Pay or SEPA. Automatic invoicing keeps books clean.',
    'features.box2_title': 'Member Milestones Tracker',
    'features.box2_desc': 'Keep tabs on rank requirements, attendance streaks, belt grading history and upcoming seminars.',
    'features.box3_title': 'Direct Announcements Hub',
    'features.box3_desc': 'Send priority broadcast, promotional club alerts or schedule revisions directly to your member feed.',
    
    // Mission Section
    'mission.badge': 'OUR MISSION',
    'mission.title': 'We empower dojos and trainers to preserve martial heritage with elite modern intelligence tools.',
    'mission.desc_title': 'Unifying the ancient spirit of budo with frictionless operations.',
    'mission.desc_p1': 'Martial arts is more than commercial fitness—it is a lifelong path of respect, self-discipline, and community. We build software that respects this boundary, eliminating bureaucratic friction so you can focus entirely on the mats.',
    'mission.desc_p2': 'Whether managing a premium full-time Gracie Jiu-Jitsu affiliate or a local karate community center, our unified template empowers instructors to structure digital masterclasses, accept worldwide subscriptions, and scale club enrollment.',

    // Members & Academies
    'members_academies.badge': '🎯 TAILORED PORTALS',
    'members_academies.title': 'Dual-Sided Ecosystem',
    'members_academies.members_title': 'For Students & Members',
    'members_academies.academies_title': 'For Dojos & Instructors',
    'members_academies.members_desc': 'Enjoy a smooth experience throughout your martial arts journey. View dojo schedules, track belt graduation criteria, and access digital learning libraries on the go.',
    'members_academies.academies_desc': 'Structure your martial arts business inside the cloud. Upload digital curriculums, receive payments automatically, and establish subscription fan channels like Patreon.',
    'members_academies.tick_business': 'Manage and control your business in the cloud.',
    'members_academies.tick_payments': 'Receive payments & upload content elegantly.',
    'members_academies.tick_experience': 'A highly personalized experience of the student journey.',
    'members_academies.tick_connection': 'Connect with your community on a deeper level.',
    'members_academies.tick_multilingual': 'Robust multilingual support (EN, ES, PT, FR).',

    // Featured Schools
    'schools.badge': '⭐ CHRONICLE DOJO ARCHIVE',
    'schools.title': 'Find Certified Academies',
    'schools.desc': 'View public websites, schedule trial classes, and review training details from vetted local partner schools.',
    'schools.explore_all': 'Explore All Academies on Interactive Map',
    'schools.search_placeholder': 'Search by academy name or city...',
    
    // App Promotion Area
    'promo.badge': '📱 GRAB THE APP',
    'promo.title': 'Your Dojo Companion App',
    'promo.desc': 'Download our customized mobile app framework to review training videos, coordinate calendar schedules, and access messaging directly on your phone.',
    'promo.active_students': 'Active Members',
    'promo.app_store': 'App Store Download',
    'promo.google_play': 'Google Play Store',

    // Testimonials Section
    'testimonials.badge': '⭐ TESTIMONIALS',
    'testimonials.title': 'What Club Owners Say',

    // Action banner
    'action.ready': 'Ready to take control of your martial journey?',
    'action.desc': 'Log in to your dojo dashboard or explore Malaga and global networks today. Free trial booking synced instantly.',
    'action.btn_map': 'Launch Interactive Map Search',
    'action.btn_page': 'View Roger Gracie Malaga Page',

    // Footer
    'footer.disclaimer': 'Martial Online operates in compliance with international payment and consumer safety frameworks. Simulated account funds used within the Patreon ecosystem are strictly for educational design demonstration.',
    'footer.rights': 'All rights reserved.',
    'footer.creator_label': 'Martial Online Digital Ecosystem Template.',

    // Martial Online Landing / Patreon
    'academy.header_ribbon': 'MARTIAL ONLINE ACADEMY',
    'academy.hero_badge': '✦ NEXT-GEN ONLINE ACADEMY & MONETIZATION',
    'academy.hero_title_p1': 'The Way of Learning &',
    'academy.hero_title_p2': 'Teaching',
    'academy.hero_desc': 'Martial Online is an educational platform that empowers instructors to create, manage, and sell video courses and live classes with worldwide students. Instructors generate active passive monthly subscription income just like Patreon!',
    'academy.btn_creator': 'LAUNCH CREATOR HUB (INSTRUCTOR MODE)',
    'academy.btn_patreon': 'EXPLORE PATREON SUBSCRIPTION TIERS',
    'academy.stat_instructors': 'SKILLFUL INSTRUCTORS',
    'academy.stat_students': 'HAPPY STUDENTS',
    'academy.stat_classes': 'LIVE CLASSES',
    'academy.stat_courses': 'VIDEO COURSES',
    'academy.new_courses': 'Newest Martial Online Courses',
    'academy.recently_pub': '★ RECENTLY PUBLISHED',
    'academy.search_courses': 'Search courses or instructors...',
    'academy.clear_filters': 'Clear Filters',
    'academy.get_course': 'GET COURSE',
    'academy.patreon_title_badge': '💖 SPONSOR EXCLUSIVES (PATREON STYLE)',
    'academy.patreon_headline': 'Direct Fan & Student Creator Subscriptions',
    'academy.patreon_desc': 'Instructors run premium subscription tiers where fans receive exclusive video roll clips, personal video critique, forum access, and direct messaging capability. Subscribing feeds their monthly income!',
    'academy.sponsor_btn': 'SPONSOR THIS CREATOR',
    'academy.active_membership': 'ACTIVE MEMBERSHIP',
    'academy.my_subscription': 'My Subscription',
    'academy.p_cta_headline': 'Monetize Your Academy & Build Passive Income',
    'academy.p_cta_desc': 'Leverage pre-made systems to bill monthly club dues, upload video tutorials, track progress and deliver automated notifications. Connect with your community like a dedicated patreon account explicitly tailored for trainers!',
    'academy.p_btn_dashboard': 'OPEN INSTRUCTOR DASHBOARD',
    'academy.p_btn_explore': 'FIND REGULAR DOJO CLASSES',
    'academy.play_lesson': 'START LESSON NOW',
    'academy.unlocked': 'UNLOCKED / START',
    'academy.standalone_buy': 'BUY STANDALONE',
    'academy.unlock_by_sub': 'UNLOCK BY SPONSORING',
    'academy.sub_status': 'ACCESS STATUS',
    'academy.about_course': 'ABOUT THIS DIGITAL COURSE',
    'academy.what_will_learn': 'WHAT WILL YOU LEARN?',

    // Masterclass Modal
    'modal.become_sponsor': 'Become a Sponsor',
    'modal.sponsor_p': 'You are about to subscribe monthly to support martial arts creators with your simulated wallet balance.',
    'modal.sub_selection': 'MEMBERSHIP SELECTION',
    'modal.bal': 'Your Balance:',
    'modal.cost': 'Monthly Cost:',
    'modal.rem_bal': 'Remaining Balance:',
    'modal.cancel': 'CANCEL',
    'modal.confirm': 'CONFIRM',

    // Dashboard
    'dash.welcome': 'Welcome back, Head Advisor!',
    'dash.p_memberships': 'Your Patreon-style martial arts academy has gained +14% new memberships this month.',
    'dash.fund_wallet': 'Fund My Wallet Add $50',
    'dash.upload_course': 'Upload Course',
    'dash.back_catalog': 'Back to Catalog',
    'dash.active_tier': 'Active Tier:',
    'dash.no_active_tier': 'No Active Subscription',
    'dash.financial_metrics': 'CREATOR DAILY REVENUE',
    'dash.extended_earnings': 'TOTAL EXTENDED EARNINGS',
    'dash.student_reads': 'STUDENT COURSE READS',
    'dash.live_classes': '🟢 Live Classes:',
    'dash.video_courses': '📘 Video Courses:',
    'dash.patreon_income': '💖 Patreon Membership income:',
    'dash.month_income': '📅 Month Income:',
    'dash.year_income': '🏆 Year Income:',
    'dash.course_sales': '💸 Direct Course Sales:',
    'dash.today_views': '📈 Today views:',
    'dash.active_subscribers': '🎯 Active Subscribers:',
    'dash.patreon_rate': '❤️ Patreon Support rate:',
    'dash.performance_chart': '📊 PERFORMANCE CHART',
    'dash.visual_sales_stats': 'Visual Sales Statistics',
    'dash.comments_community': '💬 COMMENTS & COMMUNITY',
    'dash.feedback_feed': 'Instructor Feedback Feed',
    'dash.announcement_placeholder': 'Post a generic public notice to support boards...',
    'dash.support_tickets': '🎫 SUPPORT TICKETS',
    'dash.live_channels': '🔴 INLINE LIVE CHANNELS',
    'dash.digital_catalog': '📘 ONLINE DIGITAL CATALOG',
    'dash.upload_title': 'Upload Digital Video Masterclass',
    'dash.course_title_lbl': 'Course Title',
    'dash.price_lbl': 'Standalone Access Price ($)',
    'dash.genre_lbl': 'Combat Genre Category',
    'dash.desc_lbl': 'Course Description & Syllabus',
    'dash.cancel_btn': 'DISCARD',
    'dash.confirm_btn': 'CONFIRM & UPLOAD COURSE'
  },
  es: {
    // Header & Navigation
    'nav.home': 'INICIO',
    'nav.schools': 'EXPLORAR',
    'nav.martial_online': 'ACADEMIA',
    'nav.instructor_hub': 'PANEL',
    'nav.technology': 'TECNOLOGÍA',
    'nav.price': 'PRECIOS',
    'nav.dashboard': 'PANEL',
    'nav.logout': 'SALIR',
    'nav.logout_success': '¡Sesión cerrada con éxito! Tu sesión ha sido restablecida.',
    'nav.tagline': 'TOMA EL CONTROL',
    'nav.wallet_label': 'Tu Billetera:',

    // Hero Section
    'hero.badge': '★ PLATAFORMA DE COMBATE INTEGRADA PARA ACADEMIAS',
    'hero.title_part1': 'GESTIÓN DEL DOJO',
    'hero.title_part2': 'SIMPLIFICADA Y AUTOMATIZADA',
    'hero.desc': 'Empodera a tus instructores, haz crecer tus miembros, realiza el seguimiento de certificaciones y pagos con plantillas de software personalizadas centradas en el luchador.',
    'hero.btn_map': 'BUSCAR ACADEMIAS LOCALES',
    'hero.btn_creators': 'INSTRUCTOR PATREON CREADOR',
    'hero.active_students': 'Estudiantes activos conectados globalmente',
    'hero.verified_dojos': 'Academias campeonas verificadas',

    // Features / Technology
    'features.badge': '⚡ CÓMO FUNCIONA',
    'features.title': 'Operaciones en la nube creadas para deportes de contacto',
    'features.desc': 'Automatiza los horarios de clases, la gradación de estudiantes, pagos seguros y aprendizaje digital con módulos modernos.',
    'features.box1_title': 'Soluciones de Pago Rápido',
    'features.box1_desc': 'Cobra cuotas a través de tarjeta, Apple Pay, Google Pay o SEPA. La facturación automática mantiene tus cuentas limpias.',
    'features.box2_title': 'Seguimiento de Miembros',
    'features.box2_desc': 'Controla requisitos de rango, asistencia, historial de belt gradings y los próximos seminarios.',
    'features.box3_title': 'Centro de Mensajes',
    'features.box3_desc': 'Envía avisos importantes, ofertas promocionales o cambios de horario directamente a tus miembros.',

    // Mission Section
    'mission.badge': 'NUESTRA MISIÓN',
    'mission.title': 'Empoderamos a dojos e instructores para preservar el legado marcial con herramientas de inteligencia digital.',
    'mission.desc_title': 'Uniendo el espíritu del budo con operaciones sin fricciones.',
    'mission.desc_p1': 'Las artes marciales son más que acondicionamiento físico comercial: es un camino de respeto, autodisciplina y comunidad. Creamos software que respeta este límite, eliminando la burocracia.',
    'mission.desc_p2': 'Ya sea administrando una academia premium de Gracie Jiu-Jitsu o un dojo local de karate, nuestra plantilla unificada permite estructurar clases magistrales y aceptar suscripciones de estudiantes.',

    // Members & Academies
    'members_academies.badge': '🎯 PORTALES A MEDIDA',
    'members_academies.title': 'Ecosistema de Dos Lados',
    'members_academies.members_title': 'Para Estudiantes y Miembros',
    'members_academies.academies_title': 'Para Dojos e Instructores',
    'members_academies.members_desc': 'Disfruta de una experiencia sin contratiempos en tu camino marcial. Consulta horarios, sigue requisitos de cinturón y accede a material digital sobre la marcha.',
    'members_academies.academies_desc': 'Estructura tu negocio de artes marciales en la nube. Sube programas curriculares, procesa pagos mensuales y establece canales de patrocinio tipo Patreon.',
    'members_academies.tick_business': 'Gestiona y controla tu negocio en la nube.',
    'members_academies.tick_payments': 'Recibe pagos y sube contenido elegantemente.',
    'members_academies.tick_experience': 'Una experiencia altamente personalizada para el estudiante.',
    'members_academies.tick_connection': 'Conéctate con tu comunidad a un nivel más profundo.',
    'members_academies.tick_multilingual': 'Soporte multilingüe integral (EN, ES, PT, FR).',

    // Featured Schools
    'schools.badge': '⭐ HISTORIAL DE DOJOS',
    'schools.title': 'Encuentra Academias Certificadas',
    'schools.desc': 'Explora sitios públicos, agenda clases de prueba y revisa detalles de academias locales autorizadas.',
    'schools.explore_all': 'Explorar Todas las Academias en el Mapa Interactivo',
    'schools.search_placeholder': 'Buscar por nombre o ciudad...',

    // App Promotion Area
    'promo.badge': '📱 DESCARGA LA APP',
    'promo.title': 'La App de tu Dojo',
    'promo.desc': 'Descarga nuestra aplicación móvil de d9 para ver videos técnicos, coordinar horarios y mensajería directa en tu teléfono.',
    'promo.active_students': 'Miembros Activos',
    'promo.app_store': 'Descarga App Store',
    'promo.google_play': 'Google Play Store',

    // Testimonials
    'testimonials.badge': '⭐ TESTIMONIOS',
    'testimonials.title': 'Lo Que Dicen Los Dueños',

    // Action banner
    'action.ready': '¿Listo para tomar control de tu camino marcial?',
    'action.desc': 'Inicia sesión en tu panel de control o explora redes en Málaga hoy mismo. Reserva de prueba integrada y sincronizada al instante.',
    'action.btn_map': 'Abrir Mapa Interactivo',
    'action.btn_page': 'Ver Página de Roger Gracie Málaga',

    // Footer
    'footer.disclaimer': 'Martial Online opera de acuerdo con las normativas internacionales de pagos y protección al consumidor. Los fondos virtuales de las cuentas de simulación son estrictamente instructivos.',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.creator_label': 'Plantilla del Ecosistema Digital Martial Online.',

    // Martial Online Landing / Patreon
    'academy.header_ribbon': 'MARTIAL ONLINE ACADEMY EN ESPAÑOL',
    'academy.hero_badge': '✦ ACADEMIA ONLINE Y MONETIZACIÓN DE PRÓXIMA GENERACIÓN',
    'academy.hero_title_p1': 'La Vía de Aprender y',
    'academy.hero_title_p2': 'Enseñar',
    'academy.hero_desc': 'Martial Online es una plataforma educativa que permite a los instructores crear, gestionar y vender cursos de vídeo y clases en directo a estudiantes de todo el mundo. ¡Los instructores generan ingresos de suscripción pasivos como en Patreon!',
    'academy.btn_creator': 'ABRIR CENTRO DE CREADORES (MODO INSTRUCTOR)',
    'academy.btn_patreon': 'EXPLORAR NIVELES DE SUBSCRIPCIÓN PATREON',
    'academy.stat_instructors': 'INSTRUCTORES CALIFICADOS',
    'academy.stat_students': 'ESTUDIANTES FELICES',
    'academy.stat_classes': 'CLASES EN VIVO',
    'academy.stat_courses': 'CURSOS DE VÍDEO',
    'academy.new_courses': 'Nuevos Cursos Disponibles',
    'academy.recently_pub': '★ PUBLICADO RECIENTEMENTE',
    'academy.search_courses': 'Buscar cursos o instructores...',
    'academy.clear_filters': 'Limpiar Filtros',
    'academy.get_course': 'ADQUIRIR CURSO',
    'academy.patreon_title_badge': '💖 PATROCINIOS DE CREADORES (ESTILO PATREON)',
    'academy.patreon_headline': 'Suscripciones Directas para Fanáticos y Alumnos',
    'academy.patreon_desc': 'Los instructores ofrecen niveles de suscripción donde los fanáticos reciben videos de sparring exclusivos, análisis de lucha, acceso a foros y chat privado. ¡Tu suscripción apoya su trabajo!',
    'academy.sponsor_btn': 'PATROCINAR A ESTE CREADOR',
    'academy.active_membership': 'MEMBRESÍA ACTIVA',
    'academy.my_subscription': 'Mi Suscripción',
    'academy.p_cta_headline': 'Monetiza Tu Academia y Genera Ingresos Pasivos',
    'academy.p_cta_desc': 'Utiliza nuestros sistemas integrados para cobrar cuotas recurrentes, subir videorreportajes y automatizar avisos. ¡Mantente conectado con tu comunidad con herramientas hechas para entrenadores!',
    'academy.p_btn_dashboard': 'ABRIR PANEL DE INSTRUCTOR',
    'academy.p_btn_explore': 'BUSCAR CLASES DE DOJO',
    'academy.play_lesson': 'REPRODUCIR CLASE AHORA',
    'academy.unlocked': 'DESBLOQUEADO / EMPEZAR',
    'academy.standalone_buy': 'COMPRAR CURSO INDIVIDUAL',
    'academy.unlock_by_sub': 'DESBLOQUEAR POR PATROCINIO',
    'academy.sub_status': 'ESTADO DE ACCESO',
    'academy.about_course': 'SOBRE ESTE CURSO DIGITAL',
    'academy.what_will_learn': '¿QUÉ VAS A APRENDER?',

    // Masterclass Modal
    'modal.become_sponsor': 'Conviértete en Patrocinador',
    'modal.sponsor_p': 'Estás a punto de suscribirte mensualmente para apoyar a los creadores de artes marciales usando tu saldo simulado.',
    'modal.sub_selection': 'MEMBRESÍA SELECCIONADA',
    'modal.bal': 'Tu Saldo Actual:',
    'modal.cost': 'Costo Mensual:',
    'modal.rem_bal': 'Saldo Pendiente:',
    'modal.cancel': 'CANCELAR',
    'modal.confirm': 'CONFIRMAR',

    // Dashboard
    'dash.welcome': '¡Bienvenido de nuevo, Instructor Jefe!',
    'dash.p_memberships': 'Su academia estilo Patreon ha registrado un incremento del +14% en suscripciones este mes.',
    'dash.fund_wallet': 'Cargar mi Billetera +$50',
    'dash.upload_course': 'Subir Nuevo Curso',
    'dash.back_catalog': 'Volver al Catálogo',
    'dash.active_tier': 'Nivel Activo:',
    'dash.no_active_tier': 'Sin Suscripción Activa',
    'dash.financial_metrics': 'INGRESOS DIARIOS INTERNOS',
    'dash.extended_earnings': 'BENEFICIOS TOTALES HISTÓRICOS',
    'dash.student_reads': 'VISTAS DE ESTUDIANTES',
    'dash.live_classes': '🟢 Clases en Directo:',
    'dash.video_courses': '📘 Cursos en Video:',
    'dash.patreon_income': '💖 Ingresos de Patreon:',
    'dash.month_income': '📅 Ingreso Mensual:',
    'dash.year_income': '🏆 Ingreso Anual:',
    'dash.course_sales': '💸 Ventas Directas:',
    'dash.today_views': '📈 Vistas Hoy:',
    'dash.active_subscribers': '🎯 Patrocinadores Activos:',
    'dash.patreon_rate': '❤️ Retención de Alumnos:',
    'dash.performance_chart': '📊 GRÁFICO DE RENDIMIENTO',
    'dash.visual_sales_stats': 'Estadísticas Visuales de Venta',
    'dash.comments_community': '💬 COMENTARIOS Y COMUNIDAD',
    'dash.feedback_feed': 'Muro de Feedback de Alumnos',
    'dash.announcement_placeholder': 'Escribir aviso público en el tablón general...',
    'dash.support_tickets': '🎫 SOPORTE TÉCNICO',
    'dash.live_channels': '🔴 REPRODUCCIONES EN VIVO',
    'dash.digital_catalog': '📘 CATÁLOGO DIGITAL',
    'dash.upload_title': 'Subir Masterclass en Vídeo',
    'dash.course_title_lbl': 'Título del Curso',
    'dash.price_lbl': 'Precio de Venta Individual ($)',
    'dash.genre_lbl': 'Categoría de Combate',
    'dash.desc_lbl': 'Descripción y Temario del Curso',
    'dash.cancel_btn': 'DESCARTAR',
    'dash.confirm_btn': 'CONFIRMAR Y SUBIR CURSO'
  },
  pt: {
    // Header & Navigation
    'nav.home': 'INÍCIO',
    'nav.schools': 'EXPLORAR',
    'nav.martial_online': 'ACADEMIA',
    'nav.instructor_hub': 'PAINEL',
    'nav.technology': 'TECNOLOGIA',
    'nav.price': 'PREÇO',
    'nav.dashboard': 'PAINEL',
    'nav.logout': 'SAIR',
    'nav.logout_success': 'Sessão encerrada com sucesso! Sua sessão foi redefinida.',
    'nav.tagline': 'ASSUMA O CONTROLE',
    'nav.wallet_label': 'Sua Carteira:',

    // Hero Section
    'hero.badge': '★ PLATAFORMA DE COMBATE INTEGRADA PARA ACADEMIAS',
    'hero.title_part1': 'GESTÃO DO DOJO',
    'hero.title_part2': 'SIMPLIFICADA & AUTOMATIZADA',
    'hero.desc': 'Capacite seus instrutores, aumente seus membros, acompanhe aprovações e pagamentos com softwares personalizados focados no atleta de combate.',
    'hero.btn_map': 'ENCONTRAR ACADEMIAS LOCALES',
    'hero.btn_creators': 'INSTRUTOR COMPATÍVEL PATREON',
    'hero.active_students': 'Estudantes ativos conectados globalmente',
    'hero.verified_dojos': 'Academias campeãs verificadas',

    // Features / Technology
    'features.badge': '⚡ COMO FUNCIONA',
    'features.title': 'Operações em nuvem criadas para esportes de combate',
    'features.desc': 'Automatize horários, graduações de alunos, faturamento seguro e aprendizagem digital com ferramentas robustas.',
    'features.box1_title': 'Soluções Rápidas de Cobrança',
    'features.box1_desc': 'Receba mensalidades via cartão, Apple Pay, Google Pay ou débito direto. Faturamento instantâneo sem dores de cabeça.',
    'features.box2_title': 'Acompanhamento de Alunos',
    'features.box2_desc': 'Controle requisitos técnicas de faixa, presença contínua, histórico de exames e seminários.',
    'features.box3_title': 'Central de Avisos Rápidos',
    'features.box3_desc': 'Envie alertas, propostas com descontos ou alterações de horário direto no feed do seu aluno.',

    // Mission Section
    'mission.badge': 'NOSSA MISSÃO',
    'mission.title': 'Ajudamos dojos e instrutores a preservar o legado das artes marciais através de sistemas digitais premium.',
    'mission.desc_title': 'Conectando a essência do budo com gestão ágil e sem barreiras.',
    'mission.desc_p1': 'Artes marciais são mais que negócios físicos de fitness: são caminhos de respeito e evolução corporal. Desenvolvemos ferramentas que entendem isso, reduzindo a burocracia.',
    'mission.desc_p2': 'Seja administrando uma grande rede credenciada de Gracie Jiu-Jitsu ou um clube local de bairro, nosso modelo simplifica a transmissão ou venda de lições online.',

    // Members & Academies
    'members_academies.badge': '🎯 PORTAIS EXCLUSIVOS',
    'members_academies.title': 'Ecossistema Duplo',
    'members_academies.members_title': 'Para Praticantes & Alunos',
    'members_academies.academies_title': 'Para Academias & Instrutores',
    'members_academies.members_desc': 'Desfrute de uma experiência integrada na sua jornada de lutas. Visualize a grade de treinos, veja metas de faixas e estude manuais de vídeo.',
    'members_academies.academies_desc': 'Administre os bastidores do seu dojo em um só portal. Faça upload de treinos, fature mensalidades online e tenha seu próprio Patreon de apoio à equipe.',
    'members_academies.tick_business': 'Gerencie e fiscalize seu negócio digital na nuvem.',
    'members_academies.tick_payments': 'Cobre mensalidades e envie mídias com facilidade.',
    'members_academies.tick_experience': 'Jornada personalizada para cada nível de faixa.',
    'members_academies.tick_connection': 'Conecte sua comunidade de treino fora do tatame.',
    'members_academies.tick_multilingual': 'Suporte multilíngue integrado completo (EN, ES, PT, FR).',

    // Featured Schools
    'schools.badge': '⭐ ARQUIVO DE DOJOS',
    'schools.title': 'Descubra Academias Licenciadas',
    'schools.desc': 'Acompanhe as grades de aulas de trial, verifique endereços e estude detalhes dos dojos parceiros credenciados.',
    'schools.explore_all': 'Ver Todas as Academias no Mapa Interativo',
    'schools.search_placeholder': 'Buscar por nome ou cidade...',

    // App Promotion Area
    'promo.badge': '📱 TENHA O APP',
    'promo.title': 'O Aplicativo do Seu Club',
    'promo.desc': 'Instale nosso aplicativo móvel integrado para acompanhar técnicas de treino, mudanças de agenda e manter contato imediato pelo smartphone.',
    'promo.active_students': 'Praticantes Conectados',
    'promo.app_store': 'Baixar na App Store',
    'promo.google_play': 'Disponível no Google Play',

    // Testimonials
    'testimonials.badge': '⭐ DEPOIMENTOS',
    'testimonials.title': 'Depoimentos de Líderes de Equipe',

    // Action banner
    'action.ready': 'Pronto para dominar sua rota nas artes marciais?',
    'action.desc': 'Acesse seu painel administrativo ou encontre novos treinos em Málaga hoje. Reserva de períodos de cortesia em tempo real.',
    'action.btn_map': 'Abrir Visualização de Mapa',
    'action.btn_page': 'Ver Página da Roger Gracie Málaga',

    // Footer
    'footer.disclaimer': 'Martial Online funciona conforme os regulamentos de meios de pagamento e direitos do consumidor. Saldos simulados e valores demonstrados no ecossistema Patreon são de uso puramente didático.',
    'footer.rights': 'Todos os direitos reservados.',
    'footer.creator_label': 'Modelo de Solução Completa Digital Martial Online.',

    // Martial Online Landing / Patreon
    'academy.header_ribbon': 'MARTIAL ONLINE ACADEMY EM PORTUGUÊS',
    'academy.hero_badge': '✦ ACADEMIA ONLINE & MONETIZAÇÃO DE PRÓXIMA GERAÇÃO',
    'academy.hero_title_p1': 'A Jornada de Estudo &',
    'academy.hero_title_p2': 'Ensino',
    'academy.hero_desc': 'Martial Online é uma plataforma educativa que capacita instrutores a criar, gerir e vender cursos em vídeo e aulas ao vivo para alunos do mundo inteiro. Os instrutores ganham assinatura mensal recorrente como no Patreon!',
    'academy.btn_creator': 'ABRIR PORTAL DO CRIADOR (MODO INSTRUTOR)',
    'academy.btn_patreon': 'VER NÍVEIS DE ASSINATURA PATREON',
    'academy.stat_instructors': 'INSTRUTORES GABARITADOS',
    'academy.stat_students': 'ALUNOS SATISFEITOS',
    'academy.stat_classes': 'AULAS TRANSMITIDAS',
    'academy.stat_courses': 'CURSOS DE VÍDEO',
    'academy.new_courses': 'Últimos Cursos Adicionados',
    'academy.recently_pub': '★ ADICIONADOS RECENTEMENTE',
    'academy.search_courses': 'Buscar aulas ou mestres...',
    'academy.clear_filters': 'Remover Filtros',
    'academy.get_course': 'ADQUIRIR MENSALIDADE',
    'academy.patreon_title_badge': '💖 APADRINHAMENTO DE INSCRITOS (ESTILO PATREON)',
    'academy.patreon_headline': 'Financiamento Coletivo Direto de Faixas e Fãs',
    'academy.patreon_desc': 'Crie canais de assinatura nos quais sua audiência recebe vídeos extras de treinos ao vivo, correções individuais gravadas, cupons de descontos e suporte inbox direta. Garanta sua renda fixa!',
    'academy.sponsor_btn': 'APOIAR ESTE CRIADOR',
    'academy.active_membership': 'MEMBROS ATIVO',
    'academy.my_subscription': 'Minha Assinatura',
    'academy.p_cta_headline': 'Monetize Seu Dojo e Garanta Receita Recorrente',
    'academy.p_cta_desc': 'Emita mensalidades estruturadas, gerencie transmissões ao vivo e organize lembretes de exames com um software focado no mundo de academias esportivas!',
    'academy.p_btn_dashboard': 'VISUALIZAR ÁREA DO INSTRUTOR',
    'academy.p_btn_explore': 'VER DOJOS ADERENTES',
    'academy.play_lesson': 'INICIAR TRANSMISSÃO JÁ',
    'academy.unlocked': 'ACESSÍVEL / INICIAR',
    'academy.standalone_buy': 'COMPRAR LIÇÃO ÚNICA',
    'academy.unlock_by_sub': 'LIBERAR VIA ASSINATURA',
    'academy.sub_status': 'TERMOS DE ACESSO',
    'academy.about_course': 'SOBRE ESTE CURSO DE MASTERCLASS',
    'academy.what_will_learn': 'O QUE VOCÊ VAI DETALHAR?',

    // Masterclass Modal
    'modal.become_sponsor': 'Torne-se um Apoiador',
    'modal.sponsor_p': 'Confirme sua adesão de patrocínio fixo para apoiar equipes e professores de jiu-jitsu/combate com seu saldo virtual.',
    'modal.sub_selection': 'ADESÃO SELECIONADA',
    'modal.bal': 'Sua Carteira:',
    'modal.cost': 'Custo de Assinatura:',
    'modal.rem_bal': 'Saldo Futuro:',
    'modal.cancel': 'SAIR',
    'modal.confirm': 'CONFIRMAR APOIO',

    // Dashboard
    'dash.welcome': 'Bom retorno, Mestre e Instrutor!',
    'dash.p_memberships': 'Sua comunidade oficial tem crescimento sustentável de +14% novos patrocinados nos últimos 30 dias.',
    'dash.fund_wallet': 'Injetar saldo na Carteira +$50',
    'dash.upload_course': 'Disponibilizar Curso',
    'dash.back_catalog': 'Ver Catálogo Completo',
    'dash.active_tier': 'Nivel Ativo:',
    'dash.no_active_tier': 'Sem Plano Ativo',
    'dash.financial_metrics': 'FATURAMENTO DIÁRIO INTERNO',
    'dash.extended_earnings': 'ARRECADAÇÃO GERAL HISTÓRICA',
    'dash.student_reads': 'AULAS ASSISTIDAS',
    'dash.live_classes': '🟢 Aulas em Tempo Real:',
    'dash.video_courses': '📘 Cursos Completos:',
    'dash.patreon_income': '💖 Ganhos de Assinaturas:',
    'dash.month_income': '📅 Receita Mensal:',
    'dash.year_income': '🏆 Faturamento Anual:',
    'dash.course_sales': '💸 Vendas Digitais:',
    'dash.today_views': '📈 Cliques Hoje:',
    'dash.active_subscribers': '🎯 Apoiadores em Recorrência:',
    'dash.patreon_rate': '❤️ Taxa de Fidelidade:',
    'dash.performance_chart': '📊 DESEMPENHO FINANCEIRO',
    'dash.visual_sales_stats': 'Estatísticas Gerais de Produtividade',
    'dash.comments_community': '💬 RETORNO DA COMUNIDADE',
    'dash.feedback_feed': 'Comentários e Feedbacks dos Alunos',
    'dash.announcement_placeholder': 'Digitar aviso no painel de novidades do dojo...',
    'dash.support_tickets': '🎫 CENTRAL DE AJUDA',
    'dash.live_channels': '🔴 TRANSMISSÕES AO VIVO ATIVAS',
    'dash.digital_catalog': '📘 GRADE DE CURSOS EXTRACURRICULARES',
    'dash.upload_title': 'Carregar Curso Multimídia Estudo',
    'dash.course_title_lbl': 'Título do Curso',
    'dash.price_lbl': 'Preço de Prateleira Aluno ($)',
    'dash.genre_lbl': 'Estilo de Luta Praticada',
    'dash.desc_lbl': 'Descrição Detalhado e Matéria das Aulas',
    'dash.cancel_btn': 'ANULAR',
    'dash.confirm_btn': 'PUBLICAR MASTERCLASS NO PORTAL'
  },
  fr: {
    // Header & Navigation
    'nav.home': 'ACCUEIL',
    'nav.schools': 'EXPLORER',
    'nav.martial_online': 'ACADÉMIE',
    'nav.instructor_hub': 'DASHBOARD',
    'nav.technology': 'TECHNOLOGIE',
    'nav.price': 'TARIFS',
    'nav.dashboard': 'DASHBOARD',
    'nav.logout': 'DECONNEXION',
    'nav.logout_success': 'Déconnexion réussie ! Votre session a été réinitialisée.',
    'nav.tagline': 'PRENEZ LE CONTRÔLE',
    'nav.wallet_label': 'Portefeuille :',

    // Hero Section
    'hero.badge': '★ PLATEFORME DE COMBAT INTÉGRÉE POUR LES ACADÉMIES',
    'hero.title_part1': 'GESTION DU DOJO',
    'hero.title_part2': 'SIMPLIFIÉE & AUTOMATISÉE',
    'hero.desc': 'Donnez du pouvoir à vos instructeurs, fidélisez vos membres, suivez les ceintures et gérez les paiements de votre club via des interfaces sur mesure.',
    'hero.btn_map': 'TROUVER UNE ACADÉMIE PROCHE',
    'hero.btn_creators': 'INSTRUCTEUR STYLE PATREON',
    'hero.active_students': 'Membres actifs connectés globalement',
    'hero.verified_dojos': 'Dojos partenaires certifiés',

    // Features / Technology
    'features.badge': '⚡ COMMENT ÇA MARCHE',
    'features.title': 'La gestion cloud pensée pour les arts martiaux',
    'features.desc': 'Automatisez l\'agenda du club, le suivi des grades de ceintures, la facturation en ligne et le partage des vidéos techniques.',
    'features.box1_title': 'Paiements Rapides intégrés',
    'features.box1_desc': 'Encaissez les cotisations par carte, Apple Pay, Google Pay ou SEPA. La facturation automatique garde vos comptes propres.',
    'features.box2_title': 'Suivi des Compétences',
    'features.box2_desc': 'Gérez les présences aux entraînements, le cursus technique par grade et l\'inscription aux stages.',
    'features.box3_title': 'Tableau d\'Annonces Direct',
    'features.box3_desc': 'Envoyez des alertes prioritaires, des nouvelles de l\'équipe ou des changements de grilles horaires en un clic.',

    // Mission Section
    'mission.badge': 'NOTRE MISSION',
    'mission.title': 'Nous aidons les clubs et entraîneurs à protéger l\'héritage martial grâce à des outils digitaux modernes.',
    'mission.desc_title': 'Allier l\'éthique du budo avec une gestion de club fluide.',
    'mission.desc_p1': 'Les arts martiaux sont bien plus qu\'une simple activité de fitness commercial. C\'est un chemin de vie fondé sur le respect et la rigueur. Notre application simplifie la comptabilité pour vous laisser vous concentrer sur le tapis.',
    'mission.desc_p2': 'Que vous soyez affilié à une grande école comme Gracie Jiu-Jitsu ou un club associatif local de karaté, notre plateforme vous donne les outils pour structurer vos vidéos et diffuser vos cours.',

    // Members & Academies
    'members_academies.badge': '🎯 PORTAILS DÉDIÉS',
    'members_academies.title': 'Écosystème Double',
    'members_academies.members_title': 'Pour les Élèves & Pratiquants',
    'members_academies.academies_title': 'Pour les Dojos & Enseignants',
    'members_academies.members_desc': 'Vivez une expérience digitale optimale tout au long de votre parcours martial. Consultez l\'agenda des cours, suivez vos prérequis de ceintures et accédez aux ressources.',
    'members_academies.academies_desc': 'Structurez les coulisses de votre académie dans le cloud. Partagez vos cours vidéo, recevez les paiements de vos abonnés et ouvrez votre chaîne de dons style Patreon.',
    'members_academies.tick_business': 'Gérez et contrôlez votre entreprise dans le cloud.',
    'members_academies.tick_payments': 'Percevez les cotisations et publiez des vidéos facilement.',
    'members_academies.tick_experience': 'Un parcours utilisateur hautement personnalisé par niveau.',
    'members_academies.tick_connection': 'Fédérez votre communauté même en dehors du tatami.',
    'members_academies.tick_multilingual': 'Support multilingue complet (EN, ES, PT, FR).',

    // Featured Schools
    'schools.badge': '⭐ ANNUAIRE DES DOJOS',
    'schools.title': 'Trouver des clubs de karaté certifiés',
    'schools.desc': 'Consultez les sites officiels des académies partenaires, réservez des cours de découverte et inspectez les profils techniques.',
    'schools.explore_all': 'Découvrir les Dojos sur la Carte Interactive',
    'schools.search_placeholder': 'Chercher par nom de club ou ville...',

    // App Promotion Area
    'promo.badge': '📱 APPLICATION MOBILE',
    'promo.title': 'L\'App Mobile de Votre Club',
    'promo.desc': 'Téléchargez notre framework d\'application mobile personnalisée pour consulter vos cours vidéo, confirmer votre présence et partager des messages.',
    'promo.active_students': 'Membres Connectés',
    'promo.app_store': 'Télécharger sur l\'App Store',
    'promo.google_play': 'Disponible sur Google Play',

    // Testimonials
    'testimonials.badge': '⭐ TÉMOIGNAGES',
    'testimonials.title': 'Ce qu\'en disent les Responsables de Clubs',

    // Action banner
    'action.ready': 'Prêt à prendre le contrôle de votre parcours martial ?',
    'action.desc': 'Connectez-vous à votre espace personnel ou parcourez nos clubs à Málaga. Réservation d\'essai gratuite synchronisée instantanément.',
    'action.btn_map': 'Lancer la carte interactive',
    'action.btn_page': 'Voir la page de Roger Gracie Málaga',

    // Footer
    'footer.disclaimer': 'Martial Online fonctionne en conformité avec les réglementations de paiement et de protection des consommateurs. Les portefeuilles virtuels d\'entraînement et crédits simulés ont un but exclusivement pédagogique.',
    'footer.rights': 'Tous droits réservés.',
    'footer.creator_label': 'Espace d\'Apprentissage Martial Online Modèle Intégré.',

    // Martial Online Landing / Patreon
    'academy.header_ribbon': 'MARTIAL ONLINE ACADEMY EN FRANÇAIS',
    'academy.hero_badge': '✦ PLATEFORME TECHNIQUE ET ABONNEMENTS PATREON',
    'academy.hero_title_p1': 'La Voie d\'Apprentissage &',
    'academy.hero_title_p2': 'Enseignement',
    'academy.hero_desc': 'Martial Online est une plateforme éducative qui permet aux instructeurs de créer, gérer et vendre des cours en vidéo et des cours en direct à des étudiants du monde entier. Les instructeurs génèrent des revenus passifs récurrents mensuels comme sur Patreon !',
    'academy.btn_creator': 'OUVRIR L\'ESPACE DISCIPLINE (MODO ENSEIGNANT)',
    'academy.btn_patreon': 'DÉCOUVRIR LES NIVEAUX D\'ABONNEMENTS',
    'academy.stat_instructors': 'PROFESSEURS CERTIFIÉS',
    'academy.stat_students': 'ÉLÈVES ACCOMPAGNÉS',
    'academy.stat_classes': 'SESSIONS EN LIVE',
    'academy.stat_courses': 'COURS VIDÉOS',
    'academy.new_courses': 'Nouveautés Pédagogiques du Mois',
    'academy.recently_pub': '★ AJOUTS RÉCENTS',
    'academy.search_courses': 'Chercher un cours ou un professeur...',
    'academy.clear_filters': 'Réinitialiser',
    'academy.get_course': 'ACHETER LE COURS',
    'academy.patreon_title_badge': '💖 ME COMPRENDRE SUR TIERS (STYLE PATREON)',
    'academy.patreon_headline': 'Abonnements de Soutien pour Fans et Élèves',
    'academy.patreon_desc': 'Les instructeurs proposent des formules exclusives d\'abonnements donnant accès à des vidéos de combats, des retours personnalisés en vidéo, des salons de discussion Discord et des remises. Sécurisez votre club !',
    'academy.sponsor_btn': 'SOUTENIR CE CRÉATEUR',
    'academy.active_membership': 'MEMBRE BIENFAITEUR',
    'academy.my_subscription': 'Mon Abonnement',
    'academy.p_cta_headline': 'Monétisez Votre Cursus et Stabilisez vos Revenus',
    'academy.p_cta_desc': 'Proposez des abonnements récurrents, hébergez vos cours en e-learning et planifiez des cours de préparation aux passages de grades. Un outil conçu sur mesure par et pour des compétiteurs !',
    'academy.p_btn_dashboard': 'VISITER LA CONSOLE INSTRUCTEUR',
    'academy.p_btn_explore': 'CONSULTER LES CARTES DOJOS',
    'academy.play_lesson': 'COMMENCER LA VIDÉO MAINTENANT',
    'academy.unlocked': 'ACCÈS DEBLOQUÉ / VISIONNER',
    'academy.standalone_buy': 'ACHETER LA LEÇON SEULE',
    'academy.unlock_by_sub': 'DÉVERROUILLER EN PARRAINANT',
    'academy.sub_status': 'STATUT DE MON ACCÈS',
    'academy.about_course': 'À PROPOS DE CETTE MASTERCLASS',
    'academy.what_will_learn': 'QU\'ALLEZ-VOUS EXPÉRIMENTER ?',

    // Masterclass Modal
    'modal.become_sponsor': 'Soutenir cet Instructeur',
    'modal.sponsor_p': 'Vous vous apprêtez à souscrire une contribution mensuelle pour encourager les clubs d\'arts martiaux en utilisant votre compte fictif.',
    'modal.sub_selection': 'AIDE DE SOUTIEN SÉLECTIONNÉE',
    'modal.bal': 'Votre Solde :',
    'modal.cost': 'Montant du Soutien :',
    'modal.rem_bal': 'Solde Final Estimé :',
    'modal.cancel': 'RETOUR',
    'modal.confirm': 'CONFIRMER L\'ENGAGEMENT',

    // Dashboard
    'dash.welcome': 'Ravi de vous revoir, Sensei !',
    'dash.p_memberships': 'Votre espace de contribution enregistre une progression constante de +14% d\'abonnés actifs sur le mois en cours.',
    'dash.fund_wallet': 'Recharger mon Compte +50$',
    'dash.upload_course': 'Publier un Cours Vidéo',
    'dash.back_catalog': 'Retour au Catalogue',
    'dash.active_tier': 'Niveau Actif :',
    'dash.no_active_tier': 'Aucun Abonnement Actif',
    'dash.financial_metrics': 'RECETTES EN DIRECT DU DOJO',
    'dash.extended_earnings': 'ARRIÉRÉ DE REVENUS ACQUIS',
    'dash.student_reads': 'VUES DES PROGRES ÉLÈVES',
    'dash.live_classes': '🟢 Directs Diffusés :',
    'dash.video_courses': '📘 Cursus Complets :',
    'dash.patreon_income': '💖 Financement Patreon :',
    'dash.month_income': '📅 Revenu du Mois :',
    'dash.year_income': '🏆 Annuité Récurrente :',
    'dash.course_sales': '💸 Ventes de Leçons :',
    'dash.today_views': '📈 Visites Aujourd\'hui :',
    'dash.active_subscribers': '🎯 Abonnés Récurrents :',
    'dash.patreon_rate': '❤️ Taux de Fidélité :',
    'dash.performance_chart': '📊 ANALYSE DE RENDEMENT',
    'dash.visual_sales_stats': 'Visualisation Graphique des Ventes',
    'dash.comments_community': '💬 RETOURS DU SALON COMMUNAUTÉ',
    'dash.feedback_feed': 'Commentaires et Questions des Pratiquants',
    'dash.announcement_placeholder': 'Publier une nouvelle générale pour les élèves...',
    'dash.support_tickets': '🎫 DEMANDES D\'ASSISTANCE',
    'dash.live_channels': '🔴 BOUTONS DE FLUX LIVE DIRECTS',
    'dash.digital_catalog': '📘 DOSSIER DE LEÇONS EN LIGNE',
    'dash.upload_title': 'Publier une Nouvelle Vidéo de Cursus',
    'dash.course_title_lbl': 'Titre de la Leçon',
    'dash.price_lbl': 'Tarif d\'Accès Unitaire ($)',
    'dash.genre_lbl': 'Discipline Pédagogique',
    'dash.desc_lbl': 'Description et Contenu Pédagogique',
    'dash.cancel_btn': 'REJETER',
    'dash.confirm_btn': 'METTRE EN LIGNE LA MASTERCLASS'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => ''
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('martial_online_lang');
    if (saved === 'en' || saved === 'es' || saved === 'pt' || saved === 'fr') {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('martial_online_lang', lang);
  };

  const t = (key: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to English
    const fallbackDict = translations['en'];
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
