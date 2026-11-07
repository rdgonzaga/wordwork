import type { SeedCard, SeedDeck } from '../index.ts'

function entry(
  tag: 'noun' | 'verb' | 'word' | 'phrase',
  term: string,
  reading: string,
  translation: string,
  example?: string,
  exampleTranslation?: string,
): SeedCard {
  return {
    term,
    translation,
    example,
    exampleTranslation,
    extra: reading ? { reading } : {},
    tags: ['N5', tag],
  }
}

// An empty reading means the term is already kana.
const noun = entry.bind(null, 'noun')
const verb = entry.bind(null, 'verb')
const other = entry.bind(null, 'word')
const phrase = entry.bind(null, 'phrase')

export const starterDeck: SeedDeck = {
  key: 'ja-n5-starter',
  name: 'Japanese N5 starter',
  source: 'Starter N5',
  cards: [
    phrase('こんにちは', '', 'hello; good afternoon'),
    phrase('おはよう', '', 'good morning (casual)'),
    phrase('こんばんは', '', 'good evening'),
    phrase('さようなら', '', 'goodbye'),
    phrase('ありがとう', '', 'thank you', 'ありがとうございます。', 'Thank you very much.'),
    phrase('すみません', '', 'excuse me; sorry'),
    phrase('お願いします', 'おねがいします', 'please'),
    phrase('わかりません', '', "I don't understand"),
    other('はい', '', 'yes'),
    other('いいえ', '', 'no'),

    verb('食べる', 'たべる', 'to eat', 'パンを食べます。', 'I eat bread.'),
    verb('飲む', 'のむ', 'to drink', 'お茶を飲みます。', 'I drink tea.'),
    verb('行く', 'いく', 'to go', '学校に行きます。', 'I go to school.'),
    verb('来る', 'くる', 'to come'),
    verb('見る', 'みる', 'to see; to watch', 'テレビを見ます。', 'I watch TV.'),
    verb('話す', 'はなす', 'to speak'),
    verb('読む', 'よむ', 'to read', '本を読みます。', 'I read a book.'),
    verb('勉強する', 'べんきょうする', 'to study', '日本語を勉強します。', 'I study Japanese.'),

    noun('水', 'みず', 'water'),
    noun('本', 'ほん', 'book'),
    noun('学校', 'がっこう', 'school'),
    noun('友達', 'ともだち', 'friend'),
    noun('先生', 'せんせい', 'teacher'),
    noun('電車', 'でんしゃ', 'train', '電車で行きます。', 'I go by train.'),
    noun('猫', 'ねこ', 'cat'),
    noun('家', 'いえ', 'house; home'),
    noun('日本', 'にほん', 'Japan'),
    noun('日本語', 'にほんご', 'Japanese (language)'),

    other('大きい', 'おおきい', 'big'),
    other('小さい', 'ちいさい', 'small'),
    other(
      '美味しい',
      'おいしい',
      'delicious',
      'このパンは美味しいです。',
      'This bread is delicious.',
    ),
  ],
}
