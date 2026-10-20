import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Film, Tv, BookOpen, Gamepad2, Disc, Video, 
  Bookmark, CheckCircle2, XCircle, Star, Sparkles, 
  Filter, Compass, Trash2, ArrowUpRight, 
  SlidersHorizontal, Award, HeartHandshake, Eye, Plus, Info,
  Wand2, BrainCircuit, Loader2, MessageSquareQuote, Send, X, Hash, 
  Download, Upload, Save, Key, ShieldCheck
} from 'lucide-react';

const GEMINI_MODEL = "gemini-3-flash-preview";

async function callGeminiAPI(payload, userApiKey) {
  if (!userApiKey) {
    throw new Error("Clé API Gemini manquante. Veuillez configurer votre clé dans l'application.");
  }
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 429) {
      throw new Error("Quota dépassé (429). Patientez une petite minute avant de relancer le Curateur.");
    }
    throw new Error(`Erreur API (${response.status})`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse vide de l'API");
  return text;
}

// --- CONFIGURATION DES CATÉGORIES ---
const CATEGORIES = [
  { id: 'all', label: 'Tout voir', icon: Compass, color: 'bg-stone-800 text-stone-100', badge: 'bg-stone-200 text-stone-800', accent: 'border-stone-800' },
  { id: 'cinema', label: 'Cinéma', icon: Film, color: 'bg-rose-900 text-rose-50', badge: 'bg-rose-100 text-rose-900 border-rose-200', accent: 'border-rose-800' },
  { id: 'series', label: 'Séries', icon: Tv, color: 'bg-amber-800 text-amber-50', badge: 'bg-amber-100 text-amber-900 border-amber-200', accent: 'border-amber-700' },
  { id: 'livres', label: 'Livres', icon: BookOpen, color: 'bg-emerald-900 text-emerald-50', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', accent: 'border-emerald-800' },
  { id: 'jeux', label: 'Jeux vidéo', icon: Gamepad2, color: 'bg-indigo-900 text-indigo-50', badge: 'bg-indigo-100 text-indigo-900 border-indigo-200', accent: 'border-indigo-800' },
  { id: 'musique', label: 'Musique', icon: Disc, color: 'bg-purple-900 text-purple-50', badge: 'bg-purple-100 text-purple-900 border-purple-200', accent: 'border-purple-800' },
  { id: 'youtube', label: 'YouTube', icon: Video, color: 'bg-red-800 text-red-50', badge: 'bg-red-100 text-red-900 border-red-200', accent: 'border-red-800' },
];

// --- BASE DE DONNÉES CURATÉE (36 ŒUVRES POINTUES) ---
const INITIAL_WORKS = [
  {
    id: 'cin-1',
    title: 'Memories of Murder',
    creator: 'Bong Joon-ho',
    year: 2003,
    category: 'cinema',
    wikiQuery: 'Memories of Murder',
    criticSource: 'Cahiers du Cinéma • Top Décennie',
    pitch: "Dans la province coréenne des années 80, deux inspecteurs aux méthodes opposées traquent le premier tueur en série du pays. Un polar crépusculaire d'une maîtrise formelle absolue, oscillant entre burlesque tragique et hantise.",
    tags: ['Thriller atmosphérique', 'Enquête', 'Corée', 'Mélancolie', 'Chef-d\'œuvre']
  },
  {
    id: 'cin-2',
    title: 'The Fall',
    creator: 'Tarsem Singh',
    year: 2006,
    category: 'cinema',
    wikiQuery: 'The Fall (2006 film)',
    criticSource: 'Cult Critic Pick • Restauration 4K',
    pitch: "Dans un hôpital de Los Angeles des années 1920, un cascadeur paralysé raconte à une petite fille une épopée fantastique tournée aux quatre coins du monde sans aucun effet numérique. Un poème visuel vertigineux sur le pouvoir du récit.",
    tags: ['Visuel grandiose', 'Onirique', 'Architecture', 'Aventure', 'Poésie']
  },
  {
    id: 'cin-3',
    title: 'In the Mood for Love',
    creator: 'Wong Kar-wai',
    year: 2000,
    category: 'cinema',
    wikiQuery: 'In the Mood for Love',
    criticSource: 'Sight & Sound Top 5',
    pitch: "Hong Kong, 1962. M. Chow et Mme Chan découvrent que leurs conjoints respectifs les trompent ensemble. Dans le frôlement des couloirs étroits et la fumée des nouilles nocturnes naît une romance suspendue au temps.",
    tags: ['Esthétique', 'Mélancolie', 'Romance retenue', 'Atmosphérique', 'Chef-d\'œuvre']
  },
  {
    id: 'cin-4',
    title: 'Stalker',
    creator: 'Andreï Tarkovski',
    year: 1979,
    category: 'cinema',
    wikiQuery: 'Stalker (1979 film)',
    criticSource: 'BFI Sight & Sound Top 50',
    pitch: "Une expédition clandestine au cœur de « La Zone », un territoire interdit où les lois de la physique s'effacent et où une chambre secrète exaucerait le vœu le plus intime. Une expérience hypnotique et philosophique.",
    tags: ['Philosophie', 'Science-Fiction', 'Contemplatif', 'Mystère', 'Thriller atmosphérique']
  },
  {
    id: 'cin-5',
    title: 'Portrait de la jeune fille en feu',
    creator: 'Céline Sciamma',
    year: 2019,
    category: 'cinema',
    wikiQuery: 'Portrait of a Lady on Fire',
    criticSource: 'Prix du Scénario Cannes • Télérama 4T',
    pitch: "Sur une île bretonne isolée au XVIIIe siècle, une peintre doit réaliser en secret le portrait de mariage d'une jeune femme rebelle. Un précis du regard, de la mémoire et de la création artistique.",
    tags: ['Art', 'Histoire', 'Esthétique', 'Romance retenue', 'Poésie']
  },
  {
    id: 'cin-6',
    title: 'Cure',
    creator: 'Kiyoshi Kurosawa',
    year: 1997,
    category: 'cinema',
    wikiQuery: 'Cure (film)',
    criticSource: 'Criterion Collection • Positif',
    pitch: "Une série de meurtres inexplicables secoue Tokyo : chaque coupable avoue immédiatement mais ignore ses propres motifs. L'inspecteur Takabe croise alors la route d'un jeune amnésique hypnotiseur.",
    tags: ['Thriller atmosphérique', 'Enquête', 'Psychologique', 'Mystère', 'Japon']
  },
  {
    id: 'ser-1',
    title: 'Severance',
    creator: 'Dan Erickson & Ben Stiller',
    year: 2022,
    category: 'series',
    wikiQuery: 'Severance (TV series)',
    criticSource: 'Metacritic Must-Watch • Peabody Award',
    pitch: "Les employés de Lumon Industries ont subi une opération chirurgicale séparant leurs souvenirs professionnels de leur vie privée. Un thriller architectural et kafkaïen sur l'aliénation moderne.",
    tags: ['Mystère', 'Architecture', 'Science-Fiction', 'Thriller atmosphérique', 'Conceptuel']
  },
  {
    id: 'ser-2',
    title: 'The Bear',
    creator: 'Christopher Storer',
    year: 2022,
    category: 'series',
    wikiQuery: 'The Bear (TV series)',
    criticSource: 'AFI Series of the Year • Télérama',
    pitch: "Un jeune chef prodige de la haute gastronomie revient à Chicago pour reprendre la sandwicherie familiale endettée après un drame. Une mise en scène sous haute tension doublée d'une immense tendresse humaine.",
    tags: ['Artisanat', 'Psychologique', 'Rythmé', 'Humain', 'Chef-d\'œuvre']
  },
  {
    id: 'ser-3',
    title: 'Station Eleven',
    creator: 'Patrick Somerville',
    year: 2021,
    category: 'series',
    wikiQuery: 'Station Eleven (miniseries)',
    criticSource: 'The New Yorker Best TV • IndieWire',
    pitch: "Vingt ans après une pandémie fulgurante, une troupe nomade d'acteurs et de musiciens parcourt la région des Grands Lacs pour jouer Shakespeare. Une fable lumineuse sur la survie par l'art et la beauté.",
    tags: ['Poésie', 'Philosophie', 'Onirique', 'Art', 'Mélancolie']
  },
  {
    id: 'ser-4',
    title: 'Mr. Robot',
    creator: 'Sam Esmail',
    year: 2015,
    category: 'series',
    wikiQuery: 'Mr. Robot',
    criticSource: 'Critic\'s Choice • Sight & Sound TV',
    pitch: "Elliot, ingénieur en cybersécurité souffrant de troubles dissociatifs, est recruté par un collectif anarchiste. Réalisée avec un cadrage audacieux, la série devient un vertige psychologique bouleversant.",
    tags: ['Thriller atmosphérique', 'Psychologique', 'Esthétique', 'Technologie', 'Mystère']
  },
  {
    id: 'ser-5',
    title: 'The Leftovers',
    creator: 'Damon Lindelof & Tom Perrotta',
    year: 2014,
    category: 'series',
    wikiQuery: 'The Leftovers (TV series)',
    criticSource: 'Rolling Stone #1 Decade • Cahiers',
    pitch: "Lorsque 2 % de la population mondiale disparaît soudainement sans explication, comment continuer à vivre ? Une série vertigineuse sur le deuil, le sacré et l'inexplicable, portée par la musique de Max Richter.",
    tags: ['Mystère', 'Philosophie', 'Mélancolie', 'Onirique', 'Chef-d\'œuvre']
  },
  {
    id: 'ser-6',
    title: 'Chernobyl',
    creator: 'Craig Mazin',
    year: 2019,
    category: 'series',
    wikiQuery: 'Chernobyl (miniseries)',
    criticSource: 'BAFTA & Emmy Winner • IMDb #2',
    pitch: "Le récit minutieux, heure par heure, de la catastrophe nucléaire de 1986 et du mensonge d'État soviétique. Filmé comme un film d'horreur invisible où la science affronte la bureaucratie.",
    tags: ['Histoire', 'Sciences', 'Thriller atmosphérique', 'Enquête', 'Réalisme']
  },
  {
    id: 'liv-1',
    title: 'Fictions (Ficciones)',
    creator: 'Jorge Luis Borges',
    year: 1944,
    category: 'livres',
    wikiQuery: 'Ficciones',
    criticSource: 'Le Monde des Livres • Pléiade',
    pitch: "Des bibliothèques infinies, des loteries secrètes et des encyclopédies de mondes imaginaires. En quelques pages par nouvelle, Borges réinvente la littérature comme un jeu métaphysique étourdissant.",
    tags: ['Philosophie', 'Mystère', 'Conceptuel', 'Curiosités', 'Chef-d\'œuvre']
  },
  {
    id: 'liv-2',
    title: 'Les Villes invisibles',
    creator: 'Italo Calvino',
    year: 1972,
    category: 'livres',
    wikiQuery: 'Invisible Cities',
    criticSource: 'Classique du XXe • France Culture',
    pitch: "L'explorateur Marco Polo décrit à l'empereur vieillissant Kublai Khan cinquante-cinq cités merveilleuses de son empire : villes de miroirs, d'échafaudages ou de souvenirs. Un bijou d'architecture poétique.",
    tags: ['Architecture', 'Poésie', 'Onirique', 'Curiosités', 'Philosophie']
  },
  {
    id: 'liv-3',
    title: 'La Horde du Contrevent',
    creator: 'Alain Damasio',
    year: 2004,
    category: 'livres',
    wikiQuery: 'La Horde du Contrevent',
    criticSource: 'Grand Prix de l\'Imaginaire',
    pitch: "Un groupe d'élite formé depuis l'enfance marche à contre-courant d'un vent perpétuel et dévastateur pour en chercher l'origine mythique. Une aventure polyphonique à la langue organique et puissante.",
    tags: ['Aventure', 'Philosophie', 'Science-Fiction', 'Poésie', 'Chef-d\'œuvre']
  },
  {
    id: 'liv-4',
    title: 'Une histoire de tout, ou presque...',
    creator: 'Bill Bryson',
    year: 2003,
    category: 'livres',
    wikiQuery: 'A Short History of Nearly Everything',
    criticSource: 'Prix Aventis Science Book • Royal Society',
    pitch: "Comment sait-on le poids de la Terre ou l'âge de l'univers ? Bill Bryson raconte l'histoire des sciences à travers les excentricités, rivalités et coups de génie des chercheurs. Érudit et irrésistible.",
    tags: ['Sciences', 'Histoire', 'Curiosités', 'Vulgarisation', 'Humain']
  },
  {
    id: 'liv-5',
    title: 'Piranèse',
    creator: 'Susanna Clarke',
    year: 2020,
    category: 'livres',
    wikiQuery: 'Piranesi (novel)',
    criticSource: 'Women\'s Prize for Fiction • Télérama',
    pitch: "Piranèse vit dans « La Maison », un labyrinthe infini de salles classiques envahies par les marées océaniques et peuplées de milliers de statues. Il en note les cycles jusqu'à découvrir la trace d'un autre être.",
    tags: ['Architecture', 'Mystère', 'Onirique', 'Enquête', 'Contemplatif']
  },
  {
    id: 'liv-6',
    title: 'L\'Invention de la nature',
    creator: 'Andrea Wulf',
    year: 2015,
    category: 'livres',
    wikiQuery: 'The Invention of Nature',
    criticSource: 'New York Times Top 10 • Costa Award',
    pitch: "La biographie haletante d'Alexander von Humboldt, le savant-aventurier du XIXe siècle qui a escaladé les volcans des Andes et compris le premier que la Terre était un unique organisme vivant interconnecté.",
    tags: ['Sciences', 'Histoire', 'Aventure', 'Nature', 'Vulgarisation']
  },
  {
    id: 'jeu-1',
    title: 'Outer Wilds',
    creator: 'Mobius Digital',
    year: 2019,
    category: 'jeux',
    wikiQuery: 'Outer Wilds',
    criticSource: 'BAFTA Best Game • Edge 10/10',
    pitch: "Armé d'un traducteur spatial et d'un vaisseau de bois, vous explorez un système solaire miniature piégé dans une boucle temporelle de 22 minutes avant l'explosion de son soleil. Ici, seule votre propre curiosité vous fait progresser.",
    tags: ['Exploration', 'Sciences', 'Mystère', 'Poésie', 'Chef-d\'œuvre']
  },
  {
    id: 'jeu-2',
    title: 'Return of the Obra Dinn',
    creator: 'Lucas Pope',
    year: 2018,
    category: 'jeux',
    wikiQuery: 'Return of the Obra Dinn',
    criticSource: 'Gamekult 9/10 • IGF Grand Prize',
    pitch: "En 1807, le navire marchand Obra Dinn réapparaît sans vie au large de Falmouth. En tant qu'enquêteur d'assurance doté d'un gousset figeant l'instant de chaque trépas en monochrome 1-bit, déduisez le sort des 60 passagers.",
    tags: ['Enquête', 'Histoire', 'Conceptuel', 'Esthétique', 'Mystère']
  },
  {
    id: 'jeu-3',
    title: 'Shadow of the Colossus',
    creator: 'Fumito Ueda (Team Ico)',
    year: 2005,
    category: 'jeux',
    wikiQuery: 'Shadow of the Colossus',
    criticSource: 'Famitsu Platinum • Panthéon du Jeu Vidéo',
    pitch: "Dans une terre interdite balayée par le vent et le silence, un jeune cavalier doit terrasser seize géants de pierre et de mousse pour ramener une âme à la vie. Une œuvre minimaliste d'une mélancolie monumentale.",
    tags: ['Architecture', 'Mélancolie', 'Onirique', 'Contemplatif', 'Poésie']
  },
  {
    id: 'jeu-4',
    title: 'Disco Elysium',
    creator: 'ZA/UM',
    year: 2019,
    category: 'jeux',
    wikiQuery: 'Disco Elysium',
    criticSource: 'Metacritic 97/100 • PC Gamer Top 1',
    pitch: "Dans la cité portuaire meurtrie de Revachol, un détective amnésique enquête sur un meurtre tout en dialoguant avec les 24 facettes contradictoires de sa propre psyché. Un roman interactif d'une écriture prodigieuse.",
    tags: ['Enquête', 'Philosophie', 'Psychologique', 'Art', 'Thriller atmosphérique']
  },
  {
    id: 'jeu-5',
    title: 'Chants of Sennaar',
    creator: 'Rundisc',
    year: 2023,
    category: 'jeux',
    wikiQuery: 'Chants of Sennaar',
    criticSource: 'Pégase Meilleur Jeu Indé • Le Monde',
    pitch: "Inspiré du mythe de Babel, vous gravissez une immense tour aux couleurs franco-belges où les peuples ne se comprennent plus. Carnet en main, vous déchiffrez leurs glyphes pour rétablir le dialogue.",
    tags: ['Architecture', 'Enquête', 'Curiosités', 'Esthétique', 'Conceptuel']
  },
  {
    id: 'jeu-6',
    title: 'Hollow Knight',
    creator: 'Team Cherry',
    year: 2017,
    category: 'jeux',
    wikiQuery: 'Hollow Knight',
    criticSource: 'Metacritic Must-Play • Indie Classic',
    pitch: "Plongez dans les ruines souterraines d'Hallownest, un vaste royaume d'insectes dessiné à la main avec une finesse gothique. Une exploration exigeante portée par une bande-son symphonique inoubliable.",
    tags: ['Exploration', 'Mélancolie', 'Artisanat', 'Atmosphérique', 'Aventure']
  },
  {
    id: 'mus-1',
    title: 'Modal Soul',
    creator: 'Nujabes',
    year: 2005,
    category: 'musique',
    wikiQuery: 'Modal Soul',
    criticSource: 'Cult Classic • RateYourMusic Top 50',
    pitch: "Le producteur japonais Jun Seba fusionne boucles de piano jazz mélancoliques, flûtes organiques et rythmes hip-hop feutrés. Un disque baume pour l'âme, à la fois solaire et nostalgique.",
    tags: ['Jazz-Fusion', 'Mélancolie', 'Japon', 'Atmosphérique', 'Poésie']
  },
  {
    id: 'mus-2',
    title: 'Mockroot',
    creator: 'Tigran Hamasyan',
    year: 2015,
    category: 'musique',
    wikiQuery: 'Mockroot',
    criticSource: 'Echo Jazz Award • FIP Sélection',
    pitch: "Prodige du piano, Tigran Hamasyan mêle les mélodies ancestrales du folklore arménien à la virtuosité du jazz contemporain et aux polyrythmies telluriques du rock progressif. Hypnotique.",
    tags: ['Jazz-Fusion', 'Curiosités', 'Rythmé', 'Artisanat', 'Conceptuel']
  },
  {
    id: 'mus-3',
    title: 'Music Has the Right to Children',
    creator: 'Boards of Canada',
    year: 1998,
    category: 'musique',
    wikiQuery: 'Music Has the Right to Children',
    criticSource: 'Pitchfork 10/10 • Best IDM Album',
    pitch: "À base de synthétiseurs analogiques patinés et de voix documentaires des années 70, le duo écossais façonne une électronique pastorale qui évoque des souvenirs d'enfance qu'on n'a jamais vécus.",
    tags: ['Onirique', 'Atmosphérique', 'Mélancolie', 'Mystère', 'Esthétique']
  },
  {
    id: 'mus-4',
    title: 'Promises',
    creator: 'Floating Points, Pharoah Sanders & LSO',
    year: 2021,
    category: 'musique',
    wikiQuery: 'Promises (Floating Points, Pharoah Sanders and the London Symphony Orchestra album)',
    criticSource: 'Pitchfork Album of the Year • The Guardian 5/5',
    pitch: "Un motif unique de clavecin électronique de sept notes répété pendant 46 minutes, autour duquel dialoguent le souffle spirituel du saxophoniste Pharoah Sanders et les cordes du London Symphony Orchestra.",
    tags: ['Jazz-Fusion', 'Contemplatif', 'Poésie', 'Chef-d\'œuvre', 'Atmosphérique']
  },
  {
    id: 'mus-5',
    title: 'Dummy',
    creator: 'Portishead',
    year: 1994,
    category: 'musique',
    wikiQuery: 'Dummy (album)',
    criticSource: 'Mercury Prize • Rolling Stone Top 500',
    pitch: "Né à Bristol, ce chef-d'œuvre du trip-hop associe samples de bandes originales d'espionnage des années 60, craquements de vinyle et la voix déchirante de Beth Gibbons. Un film noir en musique.",
    tags: ['Thriller atmosphérique', 'Mélancolie', 'Esthétique', 'Mystère']
  },
  {
    id: 'mus-6',
    title: 'Ágætis byrjun',
    creator: 'Sigur Rós',
    year: 1999,
    category: 'musique',
    wikiQuery: 'Ágætis byrjun',
    criticSource: 'Q Magazine Best Album • Les Inrocks',
    pitch: "Enregistré en Islande avec une guitare jouée à l'archet de violoncelle, cet album post-rock déploie des cathédrales sonores boréales d'une beauté surnaturelle.",
    tags: ['Onirique', 'Contemplatif', 'Nature', 'Poésie', 'Visuel grandiose']
  },
  {
    id: 'yt-1',
    title: 'The Great Silence & les mystères cosmiques',
    creator: 'LEMMiNO',
    year: 2021,
    category: 'youtube',
    wikiQuery: 'Fermi paradox',
    criticSource: 'Sélection Documentaire • Référence Essai Vidéo',
    pitch: "Réalisés en solitaire pendant des mois avec une précision graphique et sonore digne des plus grands studios, les documentaires de LEMMiNO explorent les énigmes historiques et le paradoxe de Fermi.",
    tags: ['Enquête', 'Mystère', 'Sciences', 'Esthétique', 'Thriller atmosphérique']
  },
  {
    id: 'yt-2',
    title: 'L\'Odyssée de la Lumière & la Physique',
    creator: 'ScienceClic',
    year: 2023,
    category: 'youtube',
    wikiQuery: 'General relativity',
    criticSource: 'Prix Café des Sciences • Vulgarisation d\'Excellence',
    pitch: "Alessandro Roussel parvient à rendre visuellement limpides la relativité générale, les champs quantiques et les trous noirs grâce à des animations géométriques d'une clarté rare.",
    tags: ['Sciences', 'Vulgarisation', 'Conceptuel', 'Curiosités', 'Esthétique']
  },
  {
    id: 'yt-3',
    title: 'Les Enquêtes Musicales & le Sound Design',
    creator: 'Feldup (Findings)',
    year: 2023,
    category: 'youtube',
    wikiQuery: 'Everywhere at the End of Time',
    criticSource: 'Culture Web Pointue • Critique Médias',
    pitch: "Bien au-delà de l'étrange, Feldup signe de véritables essais documentaires fleuves sur les œuvres perdues, l'art conceptuel sur la mémoire (Everywhere at the End of Time) et les mystères d'Internet.",
    tags: ['Enquête', 'Mystère', 'Thriller atmosphérique', 'Art', 'Psychologique']
  },
  {
    id: 'yt-4',
    title: 'Every Frame a Painting (L\'intégrale)',
    creator: 'Tony Zhou & Taylor Ramos',
    year: 2016,
    category: 'youtube',
    wikiQuery: 'Every Frame a Painting',
    criticSource: 'Criterion Channel Archive • BFI Pick',
    pitch: "La chaîne fondatrice du vidéo-essai moderne : comment Kurosawa compose le mouvement, comment Satoshi Kon monte l'espace-temps ou comment fonctionne le silence chez Scorsese.",
    tags: ['Art', 'Esthétique', 'Artisanat', 'Vulgarisation', 'Chef-d\'œuvre']
  },
  {
    id: 'yt-5',
    title: 'Les Chroniques de l\'Architecture Cachée',
    creator: 'Alt 236 (Mythologics)',
    year: 2022,
    category: 'youtube',
    wikiQuery: 'Giovanni Battista Piranesi',
    criticSource: 'Revue d\'Esthétique Imaginaire • France Inter',
    pitch: "Une plongée littéraire et musicale dans les univers visuels fascinants : l'architecture infinie de Piranesi et Tsutomu Nihei, les peintures de Beksinski ou les limbes numériques.",
    tags: ['Architecture', 'Onirique', 'Art', 'Poésie', 'Curiosités']
  },
  {
    id: 'yt-6',
    title: 'L\'Art de la Restauration Mécanique Ancienne',
    creator: 'Clickspring (Antikythera Project)',
    year: 2020,
    category: 'youtube',
    wikiQuery: 'Antikythera mechanism',
    criticSource: 'Sélection Artisanat & Histoire des Sciences',
    pitch: "Dans son atelier horloger, Chris reconstruit pièce par pièce la machine d'Anticythère — le premier calculateur astronomique grec antique — avec les outils de l'époque. Pur apaisement visuel.",
    tags: ['Artisanat', 'Histoire', 'Sciences', 'Contemplatif', 'Curiosités']
  }
];

const visualCache = {};
const CACHE_STORAGE_KEY = 'curatio_visuals_cache_v3';
try {
  const savedVisuals = localStorage.getItem(CACHE_STORAGE_KEY);
  if (savedVisuals) {
    Object.assign(visualCache, JSON.parse(savedVisuals));
  }
} catch (e) {
  console.error(e);
}

const saveVisualToCache = (id, url) => {
  visualCache[id] = url;
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(visualCache));
  } catch (e) {}
};

function isValidPosterUrl(url, creator = '') {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes('.svg') ||
    lowerUrl.includes('commons-logo') ||
    lowerUrl.includes('flag_of') ||
    lowerUrl.includes('disambig') ||
    lowerUrl.includes('icon')
  ) {
    return false;
  }
  const creatorParts = creator
    .toLowerCase()
    .split(/[\s,&()-]+/)
    .filter((part) => part.length > 3);
  const fileName = decodeURIComponent(lowerUrl.split('/').pop() || '');
  const looksLikePortrait =
    creatorParts.some((part) => fileName.includes(part)) &&
    !fileName.includes('poster') &&
    !fileName.includes('cover') &&
    !fileName.includes('film') &&
    !fileName.includes('album');

  if (looksLikePortrait) return false;
  return true;
}

async function fetchWorkArtwork(work) {
  if (visualCache[work.id]) return visualCache[work.id];

  const queryTitle = work.wikiQuery || work.title;
  const cleanCreator = work.creator.split('&')[0].split('(')[0].trim();

  if (['cinema', 'series', 'musique'].includes(work.category)) {
    try {
      const entityMap = {
        cinema: 'movie',
        series: 'tvSeason',
        musique: 'album',
      };
      const entity = entityMap[work.category];
      const queriesToTry = [
        `${work.title} ${cleanCreator}`,
        work.title,
        queryTitle.replace(/\(.*?\)/g, '').trim(),
      ];

      for (const q of queriesToTry) {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=${entity}&limit=5`;
        const res = await fetch(itunesUrl);
        const data = await res.json();
        if (data?.results?.length > 0) {
          const cleanWorkTitle = work.title.toLowerCase();
          const bestMatch =
            data.results.find((r) => {
              const name = (r.trackName || r.collectionName || '').toLowerCase();
              return name.includes(cleanWorkTitle) || cleanWorkTitle.includes(name);
            }) || data.results[0];

          if (bestMatch?.artworkUrl100) {
            const hiRes = bestMatch.artworkUrl100.replace('100x100bb', '1000x1000bb');
            saveVisualToCache(work.id, hiRes);
            return hiRes;
          }
        }
      }
    } catch (e) {}
  }

  if (work.category === 'livres') {
    try {
      const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(work.title)}&author=${encodeURIComponent(cleanCreator)}&limit=3`;
      const res = await fetch(olUrl);
      const data = await res.json();
      const docWithCover = data?.docs?.find((d) => d.cover_i);
      if (docWithCover?.cover_i) {
        const coverUrl = `https://covers.openlibrary.org/b/id/${docWithCover.cover_i}-L.jpg`;
        saveVisualToCache(work.id, coverUrl);
        return coverUrl;
      }
    } catch (e) {}
  }

  const suffixMap = {
    cinema: ' (film)',
    series: ' (TV series)',
    jeux: ' (video game)',
    livres: ' (novel)',
    musique: ' (album)',
  };

  const candidates = [
    queryTitle,
    `${work.title}${suffixMap[work.category] || ''}`,
    work.title,
  ];

  for (const lang of ['en', 'fr']) {
    for (const candidate of candidates) {
      try {
        const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`;
        const res = await fetch(summaryUrl);
        if (!res.ok) continue;
        const data = await res.json();
        const imgUrl = data?.originalimage?.source || data?.thumbnail?.source;
        if (isValidPosterUrl(imgUrl, work.creator)) {
          saveVisualToCache(work.id, imgUrl);
          return imgUrl;
        }
      } catch (e) {}
    }
  }

  return null;
}

function WorkVisualBanner({ work, catMeta, onOpenLightbox }) {
  const [imageUrl, setImageUrl] = useState(() => visualCache[work.id] || null);
  const [loading, setLoading] = useState(!visualCache[work.id]);
  const [imgError, setImgError] = useState(false);
  const CatIcon = catMeta.icon;

  useEffect(() => {
    let isMounted = true;
    if (visualCache[work.id]) {
      setImageUrl(visualCache[work.id]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWorkArtwork(work).then((url) => {
      if (isMounted) {
        setImageUrl(url);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [work]);

  const canZoom = Boolean(imageUrl && !imgError);

  return (
    <div
      onClick={() => canZoom && onOpenLightbox({ url: imageUrl, work })}
      role={canZoom ? 'button' : undefined}
      tabIndex={canZoom ? 0 : undefined}
      className={`relative w-full h-40 rounded-xl overflow-hidden mb-3.5 bg-stone-900 border border-stone-200/80 shadow-inner group/img ${canZoom ? 'cursor-zoom-in' : ''}`}
    >
      {canZoom ? (
        <>
          <img
            src={imageUrl}
            alt={`Affiche de ${work.title}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/img:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/20 opacity-75 group-hover/img:opacity-40 transition-opacity" />
          <span className="absolute bottom-2 left-2.5 z-20 text-[10px] font-medium px-2 py-0.5 rounded bg-stone-950/75 text-stone-100 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm border border-white/15 flex items-center gap-1">
            <Eye className="w-3 h-3 text-amber-400" />
            <span>Voir en entier</span>
          </span>
          <span className="absolute bottom-2 right-2.5 z-20 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-stone-950/75 text-stone-200 backdrop-blur-sm border border-white/10">
            {work.year}
          </span>
        </>
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${catMeta.color} bg-opacity-90 relative`}>
          {loading ? (
            <div className="flex flex-col items-center gap-1.5 text-stone-300">
              <Loader2 className="w-5 h-5 animate-spin opacity-75" />
              <span className="text-[11px] opacity-75">Chargement de l'affiche...</span>
            </div>
          ) : (
            <>
              <CatIcon className="w-7 h-7 opacity-40 mb-1" />
              <span className="text-xs font-semibold tracking-wide opacity-90 line-clamp-1 px-4">{work.title}</span>
              <span className="text-[10px] opacity-60 font-mono mt-0.5">{work.creator} • {work.year}</span>
            </>
          )}
        </div>
      )}
  </div>
  );
}

const getInitialState = () => {
  try {
    const saved = localStorage.getItem('almanach_culturel_v1');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    'cin-1': { status: 'consumed', rating: 5, updatedAt: Date.now() - 300000 },
    'jeu-1': { status: 'consumed', rating: 5, updatedAt: Date.now() - 200000 },
    'liv-2': { status: 'consumed', rating: 4, updatedAt: Date.now() - 100000 },
    'ser-1': { status: 'interested', rating: 0, updatedAt: Date.now() - 50000 },
    'mus-1': { status: 'interested', rating: 0, updatedAt: Date.now() - 20000 },
  };
};

export default function App() {
  const [works, setWorks] = useState(() => {
    try {
      const savedWorks = localStorage.getItem('almanach_custom_works_v1');
      if (savedWorks) {
        const parsed = JSON.parse(savedWorks);
        const existingIds = new Set(INITIAL_WORKS.map(w => w.id));
        const customOnly = parsed.filter(w => !existingIds.has(w.id));
        return [...customOnly, ...INITIAL_WORKS];
      }
    } catch (e) {}
    return INITIAL_WORKS;
  });
  const [userState, setUserState] = useState(getInitialState);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [ratingModalWork, setRatingModalWork] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [toast, setToast] = useState(null);
  const [showDismissed, setShowDismissed] = useState(false);

  // Clé API stockée en localStorage pour la sécurité GitHub
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('curatio_gemini_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(!localStorage.getItem('curatio_gemini_api_key'));
  const [tempApiKey, setTempApiKey] = useState('');

  const [aiMoodPrompt, setAiMoodPrompt] = useState('');
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [deepDiveModalWork, setDeepDiveModalWork] = useState(null);
  const [deepDiveContent, setDeepDiveContent] = useState('');
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('almanach_culturel_v1', JSON.stringify(userState)); } catch (e) {}
  }, [userState]);

  useEffect(() => {
    try { localStorage.setItem('almanach_custom_works_v1', JSON.stringify(works)); } catch (e) {}
  }, [works]);

  const showToast = (message, undoAction = null) => {
    setToast({ message, undoAction });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const trimmed = tempApiKey.trim();
    if (trimmed) {
      setApiKey(trimmed);
      localStorage.setItem('curatio_gemini_api_key', trimmed);
      setShowApiKeyModal(false);
      setTempApiKey('');
      showToast("🔑 Clé API enregistrée en toute sécurité !");
    }
  };

  const handleExportData = () => {
    try {
      const backupData = {
        version: 1,
        appName: "CURATIO",
        exportDate: new Date().toISOString(),
        userState,
        works: works.filter(w => !INITIAL_WORKS.some(iw => iw.id === w.id))
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `curatio_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("💾 Sauvegarde exportée avec succès !");
    } catch (e) {
      showToast("Erreur lors de l'exportation.");
    }
  };

  const handleImportData = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && parsed.userState) {
            setUserState(parsed.userState);
            if (Array.isArray(parsed.works) && parsed.works.length > 0) {
              setWorks(prev => {
                const existingIds = new Set(prev.map(w => w.id));
                const newCustom = parsed.works.filter(w => !existingIds.has(w.id));
                return [...newCustom, ...prev];
              });
            }
            showToast("📂 Sauvegarde restaurée avec succès !");
          } else {
            showToast("Fichier invalide.");
          }
        } catch (err) {
          showToast("Erreur de lecture du JSON.");
        }
      };
    }
  };

  const affinityProfile = useMemo(() => {
    const tagWeights = {};
    const categoryWeights = {};
    let totalRatedHigh = 0;

    works.forEach((work) => {
      const state = userState[work.id];
      if (state?.status === 'consumed' && state.rating > 0) {
        let weight = 0;
        if (state.rating === 5) { weight = 3; totalRatedHigh++; }
        else if (state.rating === 4) { weight = 2; totalRatedHigh++; }
        else if (state.rating === 3) { weight = 0.5; }
        else if (state.rating === 2) { weight = -1.5; }
        else if (state.rating === 1) { weight = -2.5; }

        work.tags.forEach((tag) => {
          tagWeights[tag] = (tagWeights[tag] || 0) + weight;
        });
        categoryWeights[work.category] = (categoryWeights[work.category] || 0) + weight * 0.5;
      } else if (state?.status === 'interested') {
        work.tags.forEach((tag) => {
          tagWeights[tag] = (tagWeights[tag] || 0) + 0.5;
        });
      }
    });

    const topTags = Object.entries(tagWeights)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, score]) => ({ tag, score }));

    return { tagWeights, categoryWeights, topTags, totalRatedHigh };
  }, [userState, works]);

  const getWorkAffinity = (work) => {
    const { tagWeights, totalRatedHigh } = affinityProfile;
    if (totalRatedHigh === 0) return { score: 0, matchedTags: [] };

    let rawScore = 0;
    const matchedTags = [];

    work.tags.forEach((tag) => {
      const w = tagWeights[tag] || 0;
      if (w > 0) {
        rawScore += w;
        if (w >= 1.5) matchedTags.push(tag);
      } else if (w < 0) {
        rawScore += w;
      }
    });

    if (rawScore <= 1) return { score: 0, matchedTags: [] };
    const normalized = Math.min(99, Math.round(68 + Math.min(rawScore, 10) * 3.1));
    return { score: normalized, matchedTags };
  };

  const getUserTasteSummary = () => {
    const loved = works
      .filter(w => userState[w.id]?.status === 'consumed' && userState[w.id]?.rating >= 4)
      .map(w => `${w.title} (${w.creator}, ${w.rating || userState[w.id].rating}★)`);
    const disliked = works
      .filter(w => (userState[w.id]?.status === 'consumed' && userState[w.id]?.rating <= 2) || userState[w.id]?.status === 'not_interested')
      .map(w => w.title);
    const watchlist = works
      .filter(w => userState[w.id]?.status === 'interested')
      .map(w => w.title);
    const favTags = affinityProfile.topTags.map(t => t.tag).join(', ');

    return { loved, disliked, watchlist, favTags };
  };

  const handleGenerateAiRecommendations = async (e) => {
    if (e) e.preventDefault();
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    if (isGeneratingRecs) return;

    setIsGeneratingRecs(true);
    try {
      const { loved, disliked, favTags } = getUserTasteSummary();
      const existingTitles = works.map(w => w.title).join(', ');
      const targetCat = selectedCategory === 'all'
        ? "réparties librement parmi cinema, series, livres, jeux, musique, youtube"
        : `exclusivement dans la catégorie "${selectedCategory}"`;

      const systemPrompt = `Tu es le conservateur en chef de "CURATIO", une application de curation culturelle française exigeante inspirée des Cahiers du Cinéma, Télérama, Sight & Sound, Pitchfork et Edge. Tu recommandes des œuvres pointues, réelles et acclamées par la critique.`;

      const userPrompt = `Génère exactement 6 nouvelles recommandations d'œuvres culturelles (${targetCat}).
Profil de l'utilisateur :
- Œuvres adorées (4-5★) : ${loved.length > 0 ? loved.join(', ') : 'Aucune pour le moment'}
- Tonalités favorites : ${favTags || 'Ouvert à la découverte'}
- Œuvres écartées/peu aimées : ${disliked.join(', ') || 'Aucune'}
- Demande ou humeur spécifique de l'utilisateur : "${aiMoodPrompt.trim() || 'Surprends-moi avec des chefs-d\'œuvre en forte affinité avec mes goûts'}"

IMPORTANT :
- Ne propose JAMAIS une œuvre déjà présente dans cette liste : ${existingTitles}.
- Les catégories autorisées pour le champ "category" sont strictement : "cinema", "series", "livres", "jeux", "musique", "youtube".
- Utilise au moins 1 ou 2 tags parmi les tonalités favorites de l'utilisateur (${favTags}) si cela s'y prête honnêtement.`;

      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                creator: { type: "STRING" },
                year: { type: "INTEGER" },
                category: { type: "STRING", enum: ["cinema", "series", "livres", "jeux", "musique", "youtube"] },
                criticSource: { type: "STRING" },
                pitch: { type: "STRING" },
                tags: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["title", "creator", "year", "category", "criticSource", "pitch", "tags"]
            }
          }
        }
      };

      const rawJson = await callGeminiAPI(payload, apiKey);
      const generatedList = JSON.parse(rawJson);

      if (Array.isArray(generatedList) && generatedList.length > 0) {
        const formattedWorks = generatedList.map((item, idx) => ({
          ...item,
          id: `ai-${Date.now()}-${idx}`,
          isAiGenerated: true
        }));

        setWorks(prev => [...formattedWorks, ...prev]);
        setActiveTab('recommendations');
        setShowDismissed(false);
        setAiMoodPrompt('');
        showToast(`✨ ${formattedWorks.length} nouvelles pépites dénichées par votre Curateur !`);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération. Vérifiez votre clé API.");
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  const handleOpenDeepDive = async (work) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setDeepDiveModalWork(work);
    setDeepDiveContent('');
    setIsLoadingDeepDive(true);

    try {
      const { loved, favTags } = getUserTasteSummary();
      const systemPrompt = `Tu es un critique culturel de renom écrivant pour CURATIO. Ton style est précis, évocateur et structuré en 3 courts paragraphes avec des sous-titres clairs.`;
      const userPrompt = `Rédige une fiche d'éclairage critique pour l'œuvre suivante :
Titre : "${work.title}" de ${work.creator} (${work.year}) — Catégorie : ${work.category}.
Pitch : ${work.pitch}

Structure ta réponse en 3 points concis :
1. **Génie formel & esthétique** : Ce qui rend cette œuvre unique dans son médium.
2. **Résonance avec vos goûts** : Pourquoi elle dialogue avec les œuvres aimées par l'utilisateur (${loved.join(', ') || favTags || 'un amateur de récits singuliers'}).
3. **Échos & Filiations** : 2 œuvres cousines dans d'autres arts.`;

      const text = await callGeminiAPI({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      }, apiKey);
      setDeepDiveContent(text);
    } catch (err) {
      setDeepDiveContent("Une erreur est survenue. Vérifiez votre clé API.");
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const handleMarkInterested = (work) => {
    const prevState = userState[work.id];
    setUserState((prev) => ({ ...prev, [work.id]: { status: 'interested', rating: 0, updatedAt: Date.now() } }));
    showToast(`« ${work.title} » ajouté à Ma Liste`, () => {
      setUserState((prev) => {
        const copy = { ...prev };
        if (prevState) copy[work.id] = prevState; else delete copy[work.id];
        return copy;
      });
    });
  };

  const handleMarkNotInterested = (work) => {
    const prevState = userState[work.id];
    setUserState((prev) => ({ ...prev, [work.id]: { status: 'not_interested', rating: 0, updatedAt: Date.now() } }));
    showToast(`« ${work.title} » masqué`, () => {
      setUserState((prev) => {
        const copy = { ...prev };
        if (prevState) copy[work.id] = prevState; else delete copy[work.id];
        return copy;
      });
    });
  };

  const handleConfirmConsumed = (work, rating) => {
    setUserState((prev) => ({ ...prev, [work.id]: { status: 'consumed', rating, updatedAt: Date.now() } }));
    setRatingModalWork(null);
    setHoverRating(0);
    showToast(`« ${work.title} » noté ${rating}/5 ★ — Algorithme affiné !`);
  };

  const handleUpdateRatingDirect = (work, newRating) => {
    setUserState((prev) => ({ ...prev, [work.id]: { status: 'consumed', rating: newRating, updatedAt: Date.now() } }));
    showToast(`Note mise à jour (${newRating}/5 ★)`);
  };

  const handleRemoveFromState = (work) => {
    setUserState((prev) => {
      const copy = { ...prev };
      delete copy[work.id];
      return copy;
    });
    showToast(`« ${work.title} » replacé dans les découvertes`);
  };

  const counts = useMemo(() => {
    let rec = 0, watch = 0, cons = 0, dismissed = 0;
    works.forEach((w) => {
      const st = userState[w.id]?.status;
      if (!st) rec++;
      else if (st === 'interested') watch++;
      else if (st === 'consumed') cons++;
      else if (st === 'not_interested') dismissed++;
    });
    return { rec, watch, cons, dismissed };
  }, [userState, works]);

  const displayedWorks = useMemo(() => {
    return works
      .filter((work) => {
        const st = userState[work.id]?.status;
        if (activeTab === 'recommendations') {
          if (showDismissed) return st === 'not_interested';
          if (st) return false;
        } else if (activeTab === 'watchlist') {
          if (st !== 'interested') return false;
        } else if (activeTab === 'consumed') {
          if (st !== 'consumed') return false;
          if (ratingFilter > 0 && userState[work.id]?.rating !== ratingFilter) return false;
        }
        if (selectedCategory !== 'all' && work.category !== selectedCategory) return false;
        if (selectedTag && !work.tags.includes(selectedTag)) return false;
        return true;
      })
      .map((work) => {
        const affinity = getWorkAffinity(work);
        const state = userState[work.id] || null;
        return { ...work, affinity, state };
      })
      .sort((a, b) => {
        if (activeTab === 'recommendations') {
          if (a.isAiGenerated && !b.isAiGenerated) return -1;
          if (!a.isAiGenerated && b.isAiGenerated) return 1;
          return b.affinity.score - a.affinity.score;
        }
        return (b.state?.updatedAt || 0) - (a.state?.updatedAt || 0);
      });
  }, [works, userState, activeTab, selectedCategory, selectedTag, ratingFilter, affinityProfile, showDismissed]);

  const tagCountsByTab = useMemo(() => {
    if (!selectedTag) return null;
    let rec = 0, watch = 0, cons = 0;
    works.forEach((w) => {
      if (!w.tags.includes(selectedTag)) return;
      const st = userState[w.id]?.status;
      if (!st) rec++;
      else if (st === 'interested') watch++;
      else if (st === 'consumed') cons++;
    });
    return { rec, watch, cons, total: rec + watch + cons };
  }, [selectedTag, works, userState]);

  const handleTagClick = (tag) => {
    if (selectedTag === tag) setSelectedTag(null);
    else { setSelectedTag(tag); showToast(`Filtrage actif sur #${tag}`); }
  };

  const getCategoryMeta = (catId) => CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 font-sans selection:bg-amber-200 selection:text-stone-900 pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-curatio-logo { font-family: 'Syne', 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.03em; }
      `}</style>

      {/* BARRE SUPÉRIEURE */}
      <header className="border-b border-stone-300 bg-[#FAF7F2]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <h1 className="text-2xl sm:text-3xl font-curatio-logo font-extrabold uppercase text-stone-950 leading-none tracking-tight">
                CURATIO
              </h1>

              <div className="flex items-center gap-1.5 bg-stone-200/80 p-1 rounded-xl border border-stone-300">
                <button
                  onClick={handleExportData}
                  className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-white text-stone-800 hover:bg-stone-50 shadow-sm transition-all"
                  title="Sauvegarder"
                >
                  <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline ml-1.5">Sauvegarder</span>
                </button>
                <label
                  className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-white text-stone-800 hover:bg-stone-50 shadow-sm transition-all cursor-pointer"
                  title="Restaurer"
                >
                  <Upload className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
                  <span className="hidden sm:inline ml-1.5">Restaurer</span>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />
                </label>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className={`flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                    apiKey ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-500 text-stone-950'
                  }`}
                  title="Configurer la clé API Gemini"
                >
                  <Key className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline ml-1.5">{apiKey ? 'Clé active' : 'API Key'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start md:self-auto w-full md:w-auto">
              <nav className="flex bg-stone-200/75 p-1.5 rounded-xl border border-stone-300/80 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => { setActiveTab('recommendations'); setShowDismissed(false); }}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 md:flex-initial ${
                    activeTab === 'recommendations' ? 'bg-stone-900 text-amber-50 shadow-sm' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Recommandations</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'recommendations' ? 'bg-stone-700 text-stone-200' : 'bg-stone-300 text-stone-700'}`}>
                    {counts.rec}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('watchlist')}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 md:flex-initial ${
                    activeTab === 'watchlist' ? 'bg-stone-900 text-amber-50 shadow-sm' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  <Bookmark className="w-4 h-4 text-emerald-400" />
                  <span>Ça m'intéresse</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'watchlist' ? 'bg-stone-700 text-stone-200' : 'bg-stone-300 text-stone-700'}`}>
                    {counts.watch}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('consumed')}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 md:flex-initial ${
                    activeTab === 'consumed' ? 'bg-stone-900 text-amber-50 shadow-sm' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-rose-400" />
                  <span>Déjà vu / lu / écouté</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'consumed' ? 'bg-stone-700 text-stone-200' : 'bg-stone-300 text-stone-700'}`}>
                    {counts.cons}
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'recommendations' && (
          <div className="mb-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-stone-100 rounded-2xl p-5 shadow-md border border-stone-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 shrink-0 mt-0.5">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-serif font-semibold text-amber-50">
                    Votre curateur culturel personnalisé
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 mt-1 flex flex-wrap items-center gap-1">
                    <span>Notez vos oeuvres dans l'onglet</span>
                    <button
                      onClick={() => setActiveTab('consumed')}
                      className="text-amber-300 hover:text-amber-200 underline font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Déjà vu / lu / écouté</span>
                    </button>
                    <span>, ou sollicitez votre Curateur pour dénicher de nouvelles pépites :</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center shrink-0">
                <button
                  onClick={() => setShowAiGenerator(!showAiGenerator)}
                  className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm sm:text-base font-bold transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  <Wand2 className="w-5 h-5" />
                  <span>{showAiGenerator ? 'Masquer le Curateur' : 'Découvrir de nouvelles oeuvres'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-stone-700/70">
              <span className="text-xs uppercase tracking-wider text-stone-400 mr-1">Vos tonalités dominantes :</span>
              {affinityProfile.topTags.length > 0 ? (
                affinityProfile.topTags.map(({ tag }) => {
                  const isTagSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isTagSelected ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-sm scale-105' : 'bg-stone-700/90 text-amber-200 border-amber-500/30 hover:bg-stone-600'
                      }`}
                    >
                      <Hash className="w-3 h-3 text-amber-400" />
                      <span>{tag}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-xs text-stone-400 italic">Notez au moins une œuvre 4 ou 5 étoiles pour révéler vos affinités.</span>
              )}
            </div>

            {showAiGenerator && (
              <form onSubmit={handleGenerateAiRecommendations} className="mt-4 pt-4 border-t border-stone-700 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={aiMoodPrompt}
                  onChange={(e) => setAiMoodPrompt(e.target.value)}
                  placeholder="Envie particulière ? (ex: un roman de SF mélancolique, un disque de jazz...)"
                  className="flex-1 bg-stone-950/90 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={isGeneratingRecs}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shrink-0"
                >
                  {isGeneratingRecs ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Consultation critique...</span></>
                  ) : (
                    <><Wand2 className="w-4 h-4" /><span>Générer 6 œuvres ({selectedCategory === 'all' ? 'Toutes' : getCategoryMeta(selectedCategory).label})</span></>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* FILTRES CATÉGORIES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all shrink-0 border ${
                    isSelected ? `${cat.color} border-transparent shadow-sm scale-[1.02]` : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'recommendations' && counts.dismissed > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors self-start sm:self-auto flex items-center gap-1.5 ${
                showDismissed ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showDismissed ? 'Retour aux recommandations' : `Voir les œuvres écartées (${counts.dismissed})`}
            </button>
          )}

          {activeTab === 'consumed' && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-stone-300">
              <span className="text-xs font-medium text-stone-500 mr-1">Filtrer par note :</span>
              {[0, 5, 4, 3, 2, 1].map((stars) => (
                <button
                  key={stars}
                  onClick={() => setRatingFilter(stars)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-0.5 ${
                    ratingFilter === stars ? 'bg-amber-500 text-stone-950' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {stars === 0 ? 'Toutes' : `${stars}★`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FILTRE HASHTAG */}
        {selectedTag && (
          <div className="mb-6 bg-amber-100/90 border border-amber-300 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-900 text-amber-300 text-xs font-bold">
                <Hash className="w-3.5 h-3.5" />
                {selectedTag}
              </span>
              <span className="text-xs sm:text-sm text-stone-800 font-medium">
                Exploration du hashtag <strong>#{selectedTag}</strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold transition-colors self-start sm:self-auto shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Effacer le filtre #{selectedTag}</span>
            </button>
          </div>
        )}

        {/* GRILLE D'ŒUVRES */}
        {displayedWorks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sans font-bold text-stone-800">Aucune œuvre dans cette sélection</h3>
            <p className="text-sm text-stone-600 mt-2">Modifiez vos filtres ou explorez une autre catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedWorks.map((work) => {
              const catMeta = getCategoryMeta(work.category);
              const CatIcon = catMeta.icon;
              const isHighAffinity = work.affinity.score >= 78 && activeTab === 'recommendations' && !showDismissed;

              return (
                <article
                  key={work.id}
                  className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                    isHighAffinity ? 'border-amber-400/90 ring-1 ring-amber-300/50' : 'border-stone-200/90'
                  }`}
                >
                  <div>
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2 border-b border-stone-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${catMeta.badge}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                        {catMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200/60 truncate max-w-[62%]">
                        <Award className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">{work.criticSource}</span>
                      </span>
                    </div>

                    <div className="p-5">
                      {work.isAiGenerated && (
                        <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
                          <Wand2 className="w-3 h-3 text-purple-700" />
                          <span>Sélection Sur-Mesure par votre Curateur</span>
                        </div>
                      )}

                      {work.affinity.score > 0 && activeTab === 'recommendations' && !showDismissed && (
                        <div className="mb-3 flex items-center justify-between bg-amber-50/90 border border-amber-200/80 px-3 py-1.5 rounded-lg">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Affinité : {work.affinity.score}%</span>
                          </div>
                        </div>
                      )}

                      <WorkVisualBanner work={work} catMeta={catMeta} onOpenLightbox={(data) => setLightboxData(data)} />

                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-xl font-sans font-bold tracking-tight text-stone-900 leading-snug group-hover:text-amber-900 transition-colors">
                          {work.title}
                        </h3>
                        <span className="text-xs font-mono text-stone-500 shrink-0">{work.year}</span>
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mt-1">{work.creator}</p>
                      <p className="text-sm text-stone-700 mt-3.5 leading-relaxed">{work.pitch}</p>

                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {work.tags.map((tag) => {
                          const isSelected = selectedTag === tag;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleTagClick(tag)}
                              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-0.5 cursor-pointer ${
                                isSelected ? 'bg-stone-900 text-amber-300 border border-stone-900 font-bold' : 'bg-stone-100 text-stone-600 border border-stone-200/60 hover:bg-stone-200'
                              }`}
                            >
                              <span className="opacity-60">#</span>
                              <span>{tag}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
                        <button
                          onClick={() => handleOpenDeepDive(work)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50/70 hover:bg-amber-100/80 px-3 py-1.5 rounded-lg border border-amber-200/70 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Éclairage critique</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-stone-50/90 border-t border-stone-200/80">
                    {activeTab === 'recommendations' && !showDismissed && (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleMarkInterested(work)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-sm"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>Intéressant</span>
                        </button>
                        <button
                          onClick={() => { setRatingModalWork(work); setHoverRating(0); }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Déjà vu/lu</span>
                        </button>
                        <button
                          onClick={() => handleMarkNotInterested(work)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white text-stone-600 border border-stone-200 hover:bg-rose-50 hover:text-rose-800 text-xs font-medium"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Masquer</span>
                        </button>
                      </div>
                    )}

                    {activeTab === 'recommendations' && showDismissed && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500 italic">Œuvre écartée</span>
                        <button onClick={() => handleRemoveFromState(work)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium">Restaurer</button>
                      </div>
                    )}

                    {activeTab === 'watchlist' && (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => { setRatingModalWork(work); setHoverRating(0); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-700 text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Marquer comme vu & Noter</span>
                        </button>
                        <button onClick={() => handleRemoveFromState(work)} className="p-2 rounded-xl bg-white text-stone-500 border border-stone-200 hover:text-rose-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {activeTab === 'consumed' && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-stone-600 mr-1.5">Note :</span>
                          {[1, 2, 3, 4, 5].map((star) => {
                            const currentRating = work.state?.rating || 0;
                            return (
                              <button key={star} onClick={() => handleUpdateRatingDirect(work, star)} className="p-1 hover:scale-110">
                                <Star className={`w-5 h-5 ${star <= currentRating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={() => handleRemoveFromState(work)} className="text-xs text-stone-400 hover:text-rose-700 p-1.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* MODALE CONFIGURATION CLÉ API */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveApiKey} className="bg-[#FAF7F2] border border-stone-300 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-amber-800">
              <Key className="w-5 h-5" />
              <h3 className="text-lg font-serif font-bold">Configuration de la clé API Gemini</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Pour activer le Curateur intelligent et l'éclairage critique, veuillez entrer votre clé API Google AI Studio. Elle sera stockée uniquement dans votre navigateur et ne sera jamais publiée sur GitHub.
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Collez votre clé API ici (AIza...)"
              className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-amber-500 mb-4"
              required
            />
            <div className="flex items-center justify-end gap-2">
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-200"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors shadow-sm"
              >
                Enregistrer la clé
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE NOTATION */}
      {ratingModalWork && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-stone-300 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <span className="text-xs uppercase tracking-widest font-semibold text-amber-800">Carnet Critique</span>
              <button onClick={() => setRatingModalWork(null)} className="text-stone-400 hover:text-stone-700 text-sm font-medium">Fermer</button>
            </div>
            <h3 className="text-2xl font-serif font-bold text-stone-900">{ratingModalWork.title}</h3>
            <p className="text-xs text-stone-500 mt-0.5">{ratingModalWork.creator} ({ratingModalWork.year})</p>
            <div className="my-6 flex flex-col items-center justify-center bg-white py-5 px-4 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleConfirmConsumed(ratingModalWork, star)}
                    className="p-2 rounded-lg hover:bg-amber-50 transition-all hover:scale-110"
                  >
                    <Star className={`w-8 h-8 ${star <= hoverRating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-stone-500 mt-2.5 h-4">
                {hoverRating === 5 ? "5★ — Chef-d'œuvre" : hoverRating === 4 ? "4★ — Très grande réussite" : hoverRating === 3 ? "3★ — Intéressant" : hoverRating === 2 ? "2★ — Mitigé" : hoverRating === 1 ? "1★ — Décevant" : "Cliquez sur une étoile"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉCLAIRAGE CRITIQUE */}
      {deepDiveModalWork && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-stone-300 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <span className="text-xs uppercase tracking-widest font-semibold text-amber-800">Éclairage Critique</span>
              <button onClick={() => setDeepDiveModalWork(null)} className="text-stone-400 hover:text-stone-700 text-sm">Fermer</button>
            </div>
            <h3 className="text-2xl font-serif font-bold text-stone-900">{deepDiveModalWork.title}</h3>
            <div className="overflow-y-auto pr-1 flex-1 my-3">
              {isLoadingDeepDive ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-500 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-700" />
                  <p className="text-xs font-medium">Analyse critique en cours...</p>
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-xl p-4 text-sm text-stone-800 leading-relaxed whitespace-pre-line font-serif">
                  {deepDiveContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxData && (
        <div onClick={() => setLightboxData(null)} className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-3xl w-full flex flex-col items-center cursor-default">
            <div className="bg-stone-900/60 p-2 rounded-2xl border border-stone-700/80 shadow-2xl">
              <img src={lightboxData.url} alt={lightboxData.work.title} className="max-h-[75vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-40 bg-stone-900 text-stone-100 px-4 py-3 rounded-xl shadow-xl border border-stone-700 flex items-center gap-3 text-sm">
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
