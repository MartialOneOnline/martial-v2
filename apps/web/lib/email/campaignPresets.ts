import type { CampaignType } from '../prisma-client/enums'

type Lang = 'en' | 'es' | 'pt' | 'fr'

type Preset = { subject: string; body: string }

// Starter copy used only to prefill the campaign composer — staff can freely
// edit subject/body afterwards, same as the free-form directMessage flow.
// {{nombre}} / {{escuela}} / {{cinturon}} are substituted per-recipient at send time.
export const CAMPAIGN_PRESETS: Record<CampaignType, Record<Lang, Preset>> = {
  REMINDER: {
    en: {
      subject: 'We miss you at {{escuela}}!',
      body: "Hi {{nombre}},\n\nIt's been a while since we last saw you on the mats at {{escuela}}. Your spot is still there — come back whenever you're ready, we'd love to have you training again.",
    },
    es: {
      subject: '¡Te echamos de menos en {{escuela}}!',
      body: 'Hola {{nombre}},\n\nHace tiempo que no te vemos en el tatami de {{escuela}}. Tu sitio sigue ahí — vuelve cuando quieras, nos encantaría verte entrenar de nuevo.',
    },
    pt: {
      subject: 'Sentimos sua falta em {{escuela}}!',
      body: 'Olá {{nombre}},\n\nFaz um tempo que não te vemos no tatame de {{escuela}}. Seu lugar continua lá — volte quando quiser, adoraríamos te ver treinando de novo.',
    },
    fr: {
      subject: 'Vous nous manquez chez {{escuela}} !',
      body: "Bonjour {{nombre}},\n\nCela fait un moment qu'on ne vous a pas vu sur le tatami de {{escuela}}. Votre place vous attend toujours — revenez quand vous voulez, on serait ravis de vous revoir sur les tapis.",
    },
  },
  DISCOUNT_OFFER: {
    en: {
      subject: 'Come back to {{escuela}} — special offer inside',
      body: "Hi {{nombre}},\n\nWe'd love to welcome you back to {{escuela}}. As a returning student, we're offering you a discount on your first month back — reply to this email or drop by to claim it.",
    },
    es: {
      subject: 'Vuelve a {{escuela}} — oferta especial',
      body: 'Hola {{nombre}},\n\nNos encantaría darte la bienvenida de nuevo a {{escuela}}. Como alumno que vuelve, te ofrecemos un descuento en tu primer mes de vuelta — responde a este email o pásate por la escuela para conseguirlo.',
    },
    pt: {
      subject: 'Volte para {{escuela}} — oferta especial',
      body: 'Olá {{nombre}},\n\nAdoraríamos te dar as boas-vindas de volta a {{escuela}}. Como aluno que retorna, oferecemos um desconto no seu primeiro mês de volta — responda este e-mail ou passe na escola para aproveitar.',
    },
    fr: {
      subject: 'Revenez chez {{escuela}} — offre spéciale',
      body: "Bonjour {{nombre}},\n\nNous serions ravis de vous accueillir à nouveau chez {{escuela}}. En tant qu'élève de retour, nous vous offrons une réduction sur votre premier mois — répondez à cet email ou passez à l'école pour en profiter.",
    },
  },
  BELT_PROGRESS: {
    en: {
      subject: "Your {{cinturon}} progress at {{escuela}} is waiting",
      body: "Hi {{nombre}},\n\nYou were making great progress toward your next belt at {{escuela}}. Don't let that work go to waste — come back and pick up right where you left off.",
    },
    es: {
      subject: 'Tu progreso de {{cinturon}} en {{escuela}} te espera',
      body: 'Hola {{nombre}},\n\nEstabas progresando muy bien hacia tu próximo cinturón en {{escuela}}. No dejes que ese esfuerzo se pierda — vuelve y sigue justo donde lo dejaste.',
    },
    pt: {
      subject: 'Seu progresso de {{cinturon}} em {{escuela}} está esperando',
      body: 'Olá {{nombre}},\n\nVocê estava progredindo muito bem rumo à sua próxima faixa em {{escuela}}. Não deixe esse esforço se perder — volte e continue exatamente de onde parou.',
    },
    fr: {
      subject: 'Votre progression vers {{cinturon}} chez {{escuela}} vous attend',
      body: "Bonjour {{nombre}},\n\nVous progressiez très bien vers votre prochaine ceinture chez {{escuela}}. Ne laissez pas ces efforts se perdre — revenez et reprenez là où vous vous étiez arrêté.",
    },
  },
  SEASONAL: {
    en: {
      subject: 'New season, new start at {{escuela}}',
      body: 'Hi {{nombre}},\n\nA new season is a great time for a fresh start. We\'d love to see you back on the mats at {{escuela}} — come train with us again.',
    },
    es: {
      subject: 'Nueva temporada, nuevo comienzo en {{escuela}}',
      body: 'Hola {{nombre}},\n\nUna nueva temporada es un buen momento para empezar de nuevo. Nos encantaría verte otra vez en el tatami de {{escuela}} — vuelve a entrenar con nosotros.',
    },
    pt: {
      subject: 'Nova temporada, novo começo em {{escuela}}',
      body: 'Olá {{nombre}},\n\nUma nova temporada é uma ótima oportunidade para recomeçar. Adoraríamos te ver de volta no tatame de {{escuela}} — volte a treinar com a gente.',
    },
    fr: {
      subject: 'Nouvelle saison, nouveau départ chez {{escuela}}',
      body: "Bonjour {{nombre}},\n\nUne nouvelle saison est le moment idéal pour repartir à zéro. Nous aimerions vous revoir sur le tatami de {{escuela}} — revenez vous entraîner avec nous.",
    },
  },
  ANNIVERSARY: {
    en: {
      subject: 'It\'s been a while since you joined {{escuela}}',
      body: 'Hi {{nombre}},\n\nIt\'s been some time since you first joined {{escuela}}. We\'d love to celebrate by welcoming you back — come by and train with us again.',
    },
    es: {
      subject: 'Ha pasado un tiempo desde que te uniste a {{escuela}}',
      body: 'Hola {{nombre}},\n\nHa pasado un tiempo desde que empezaste en {{escuela}}. Nos encantaría celebrarlo dándote la bienvenida de nuevo — pásate y entrena con nosotros otra vez.',
    },
    pt: {
      subject: 'Faz um tempo que você entrou em {{escuela}}',
      body: 'Olá {{nombre}},\n\nJá faz um tempo desde que você começou em {{escuela}}. Adoraríamos comemorar te dando as boas-vindas de volta — passe por aqui e treine com a gente de novo.',
    },
    fr: {
      subject: 'Cela fait un moment que vous avez rejoint {{escuela}}',
      body: "Bonjour {{nombre}},\n\nCela fait un moment que vous avez rejoint {{escuela}}. Nous aimerions le célébrer en vous accueillant à nouveau — venez vous entraîner avec nous.",
    },
  },
  CUSTOM: {
    en: { subject: '', body: '' },
    es: { subject: '', body: '' },
    pt: { subject: '', body: '' },
    fr: { subject: '', body: '' },
  },
}
