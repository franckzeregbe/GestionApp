export const CATEGORIES = {
  income: [
    'Salaire', 'Freelance', 'Business', 'Vente', 'Investissement',
    'Loyer perçu', 'Remboursement', 'Cadeau reçu', 'Prime', 'Pension',
    'Bourse', 'Dividende', 'Autre revenu',
  ],
  expense: [
    // Logement
    'Loyer', 'Hypothèque', 'Électricité', 'Eau', 'Gaz', 'Internet', 'Téléphone',
    // Alimentation
    'Épicerie', 'Restaurant', 'Café',
    // Transport
    'Carburant', 'Transport en commun', 'Taxi / VTC', 'Entretien véhicule', 'Assurance auto',
    // Santé
    'Médecin', 'Pharmacie', 'Sport / Fitness', 'Bien-être',
    // Loisirs
    'Sorties', 'Voyage', 'Streaming', 'Jeux', 'Livres / Formation',
    // Shopping
    'Vêtements', 'Électronique', 'Maison / Déco',
    // Finance
    'Épargne', 'Investissement', 'Crédit', 'Assurance', 'Impôts / Taxes',
    // Famille
    'Enfants', 'Animaux', 'Cadeaux',
    // Divers
    'Abonnements', 'Imprévus', 'Autres',
  ],
}

export const ICONS: Record<string, string> = {
  // Revenus
  Salaire: '💼', Freelance: '💻', Business: '🏢', Vente: '🏷️',
  Investissement: '📈', 'Loyer perçu': '🏠', Remboursement: '↩️',
  'Cadeau reçu': '🎁', Prime: '🏆', Pension: '👴', Bourse: '📊',
  Dividende: '💹', 'Autre revenu': '💵',
  // Logement
  Loyer: '🏠', Hypothèque: '🏦', Électricité: '⚡', Eau: '💧',
  Gaz: '🔥', Internet: '🌐', Téléphone: '📱',
  // Alimentation
  Épicerie: '🛒', Restaurant: '🍽️', Café: '☕',
  // Transport
  Carburant: '⛽', 'Transport en commun': '🚌', 'Taxi / VTC': '🚕',
  'Entretien véhicule': '🔧', 'Assurance auto': '🛡️',
  // Santé
  Médecin: '🏥', Pharmacie: '💊', 'Sport / Fitness': '🏋️', 'Bien-être': '🧘',
  // Loisirs
  Sorties: '🎉', Voyage: '✈️', Streaming: '📺', Jeux: '🎮',
  'Livres / Formation': '📚',
  // Shopping
  Vêtements: '👕', Électronique: '🖥️', 'Maison / Déco': '🛋️',
  // Finance
  Épargne: '🐷', Crédit: '💳', Assurance: '🛡️', 'Impôts / Taxes': '🏛️',
  // Famille
  Enfants: '👶', Animaux: '🐾', Cadeaux: '🎁',
  // Divers
  Abonnements: '🔄', Imprévus: '⚠️', Autres: '📦',
}

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const MONTHS_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
]
