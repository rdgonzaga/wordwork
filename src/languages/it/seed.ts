import type { SeedCard, SeedDeck } from '../index.ts'

function noun(
  article: string,
  term: string,
  plural: string,
  translation: string,
  example?: string,
  exampleTranslation?: string,
): SeedCard {
  return {
    term,
    translation,
    example,
    exampleTranslation,
    extra: { article, plural },
    tags: ['A1', 'noun'],
  }
}

function word(tag: 'verb' | 'word' | 'phrase') {
  return (
    term: string,
    translation: string,
    example?: string,
    exampleTranslation?: string,
  ): SeedCard => ({
    term,
    translation,
    example,
    exampleTranslation,
    extra: {},
    tags: ['A1', tag],
  })
}

const verb = word('verb')
const other = word('word')
const phrase = word('phrase')

export const starterDeck: SeedDeck = {
  key: 'it-a1-starter',
  name: 'Italian A1 starter',
  source: 'Starter A1',
  cards: [
    phrase('Ciao', 'hello; bye'),
    phrase('Buongiorno', 'good morning; good day'),
    phrase('Buonasera', 'good evening'),
    phrase('Arrivederci', 'goodbye'),
    phrase('Grazie', 'thank you', 'Grazie mille!', 'Thanks a lot!'),
    phrase('Prego', "you're welcome; please go ahead"),
    phrase('Per favore', 'please', 'Un caffè, per favore.', 'A coffee, please.'),
    phrase('Scusi', 'excuse me (formal)'),
    phrase('Come stai?', 'How are you?'),
    phrase('Non capisco', "I don't understand"),
    phrase('Quanto costa?', 'How much does it cost?'),
    other('sì', 'yes'),
    other('no', 'no'),

    verb('essere', 'to be', 'Io sono stanco.', "I'm tired."),
    verb('avere', 'to have', 'Ho un gatto.', 'I have a cat.'),
    verb('parlare', 'to speak', 'Parli inglese?', 'Do you speak English?'),
    verb('mangiare', 'to eat', 'Mangiamo alle otto.', 'We eat at eight.'),
    verb('bere', 'to drink', 'Bevo un tè.', "I'm drinking a tea."),
    verb('andare', 'to go', 'Vado a casa.', "I'm going home."),
    verb('venire', 'to come', 'Vieni con noi?', 'Are you coming with us?'),
    verb('volere', 'to want', 'Voglio un gelato.', 'I want an ice cream.'),
    verb('abitare', 'to live (reside)', 'Abito a Roma.', 'I live in Rome.'),

    noun("l'", 'acqua', 'acque', 'water', "L'acqua è fredda.", 'The water is cold.'),
    noun('il', 'pane', 'pani', 'bread', 'Il pane è fresco.', 'The bread is fresh.'),
    noun('il', 'caffè', 'caffè', 'coffee', 'Il caffè è caldo.', 'The coffee is hot.'),
    noun('la', 'casa', 'case', 'house; home', 'La casa è piccola.', 'The house is small.'),
    noun('il', 'libro', 'libri', 'book', 'Il libro è nuovo.', 'The book is new.'),
    noun('la', 'città', 'città', 'city', 'La città è grande.', 'The city is big.'),
    noun('la', 'strada', 'strade', 'street', 'La strada è lunga.', 'The street is long.'),
    noun('il', 'treno', 'treni', 'train', 'Il treno arriva.', 'The train is arriving.'),
    noun('la', 'scuola', 'scuole', 'school'),
    noun('la', 'famiglia', 'famiglie', 'family', 'La mia famiglia è grande.', 'My family is big.'),
    noun("l'", 'amico', 'amici', 'friend (male)', 'Marco è un amico.', 'Marco is a friend.'),
    noun('lo', 'studente', 'studenti', 'student'),
    noun('il', 'bambino', 'bambini', 'child; little boy'),
    noun("l'", 'uomo', 'uomini', 'man'),
    noun('la', 'donna', 'donne', 'woman'),

    other('bello', 'beautiful; nice', 'Che bella giornata!', 'What a beautiful day!'),
    other('grande', 'big', 'Roma è grande.', 'Rome is big.'),
    other('piccolo', 'small'),
    other('buono', 'good', 'Il pane è buono.', 'The bread is good.'),
  ],
}
