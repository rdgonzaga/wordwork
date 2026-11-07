import type { SeedCard } from '../index.ts'
import { group } from './build.ts'

const timeAndNumbers = (() => {
  const { noun, other } = group('A1 · Numbers and time')
  return [
    other('eins', 'one', 'Eins, zwei, drei!', 'One, two, three!'),
    other('zwei', 'two', 'Ich habe zwei Katzen.', 'I have two cats.'),
    other('drei', 'three', 'Wir sind drei Personen.', 'There are three of us.'),
    other('vier', 'four', 'Es ist vier Uhr.', "It's four o'clock."),
    other('fünf', 'five', 'Fünf Euro, bitte.', 'Five euros, please.'),
    other('sechs', 'six'),
    other('sieben', 'seven', 'Ich stehe um sieben auf.', 'I get up at seven.'),
    other('acht', 'eight'),
    other('neun', 'nine'),
    other('zehn', 'ten', 'Der Kurs kostet zehn Euro.', 'The course costs ten euros.'),
    other('hundert', 'hundred'),
    noun('der', 'Montag', 'Montage', 'Monday', 'Am Montag arbeite ich.', 'On Monday I work.'),
    noun(
      'der',
      'Dienstag',
      'Dienstage',
      'Tuesday',
      'Dienstag habe ich frei.',
      "I'm off on Tuesday.",
    ),
    noun('der', 'Mittwoch', 'Mittwoche', 'Wednesday'),
    noun('der', 'Donnerstag', 'Donnerstage', 'Thursday'),
    noun(
      'der',
      'Freitag',
      'Freitage',
      'Friday',
      'Am Freitag gehen wir ins Kino.',
      'On Friday we go to the cinema.',
    ),
    noun('der', 'Samstag', 'Samstage', 'Saturday'),
    noun(
      'der',
      'Sonntag',
      'Sonntage',
      'Sunday',
      'Am Sonntag schlafe ich lange.',
      'On Sunday I sleep in.',
    ),
    noun(
      'der',
      'Monat',
      'Monate',
      'month',
      'Der Monat hat dreißig Tage.',
      'The month has thirty days.',
    ),
    noun(
      'die',
      'Stunde',
      'Stunden',
      'hour; lesson',
      'Eine Stunde hat sechzig Minuten.',
      'An hour has sixty minutes.',
    ),
    noun('der', 'Abend', 'Abende', 'evening', 'Am Abend lese ich.', 'In the evening I read.'),
    noun('die', 'Nacht', 'Nächte', 'night', 'Die Nacht ist kalt.', 'The night is cold.'),
  ] satisfies SeedCard[]
})()

const phrases = (() => {
  const { phrase } = group('A1 · Greetings and phrases')
  return [
    phrase('Guten Abend', 'good evening'),
    phrase('Gute Nacht', 'good night'),
    phrase('Auf Wiedersehen', 'goodbye'),
    phrase('Bis bald', 'see you soon'),
    phrase('Bis später', 'see you later'),
    phrase('Guten Appetit', 'enjoy your meal'),
    phrase('Kein Problem', 'no problem'),
    phrase('Wie bitte?', 'Pardon?', 'Wie bitte? Noch einmal, bitte.', 'Pardon? Once more, please.'),
  ] satisfies SeedCard[]
})()

const people = (() => {
  const { noun } = group('A1 · People and family')
  return [
    noun('der', 'Sohn', 'Söhne', 'son', 'Mein Sohn ist acht.', 'My son is eight.'),
    noun(
      'die',
      'Tochter',
      'Töchter',
      'daughter',
      'Ihre Tochter lernt Deutsch.',
      'Her daughter is learning German.',
    ),
    noun(
      'die',
      'Eltern',
      null,
      'parents (plural only)',
      'Meine Eltern wohnen in Cebu.',
      'My parents live in Cebu.',
    ),
    noun('der', 'Großvater', 'Großväter', 'grandfather'),
    noun('die', 'Großmutter', 'Großmütter', 'grandmother'),
    noun('der', 'Onkel', 'Onkel', 'uncle'),
    noun('die', 'Tante', 'Tanten', 'aunt'),
    noun(
      'der',
      'Junge',
      'Jungen',
      'boy',
      'Der Junge spielt Fußball.',
      'The boy is playing football.',
    ),
    noun('das', 'Mädchen', 'Mädchen', 'girl', 'Das Mädchen singt.', 'The girl is singing.'),
    noun(
      'der',
      'Mensch',
      'Menschen',
      'person; human being',
      'Viele Menschen sind hier.',
      'Many people are here.',
    ),
    noun(
      'der',
      'Nachbar',
      'Nachbarn',
      'neighbor (male)',
      'Mein Nachbar ist nett.',
      'My neighbor is nice.',
    ),
    noun('das', 'Baby', 'Babys', 'baby'),
  ] satisfies SeedCard[]
})()

const food = (() => {
  const { noun } = group('A1 · Food and drink')
  return [
    noun(
      'das',
      'Frühstück',
      'Frühstücke',
      'breakfast',
      'Das Frühstück ist um acht.',
      'Breakfast is at eight.',
    ),
    noun('das', 'Fleisch', null, 'meat', 'Ich esse kein Fleisch.', "I don't eat meat."),
    noun('der', 'Fisch', 'Fische', 'fish', 'Der Fisch schmeckt gut.', 'The fish tastes good.'),
    noun(
      'das',
      'Ei',
      'Eier',
      'egg',
      'Ich esse ein Ei zum Frühstück.',
      'I have an egg for breakfast.',
    ),
    noun('der', 'Käse', 'Käse', 'cheese', 'Käse und Brot, bitte.', 'Cheese and bread, please.'),
    noun('der', 'Reis', null, 'rice', 'Wir essen Reis mit Fisch.', 'We eat rice with fish.'),
    noun('die', 'Kartoffel', 'Kartoffeln', 'potato'),
    noun('das', 'Gemüse', null, 'vegetables', 'Gemüse ist gesund.', 'Vegetables are healthy.'),
    noun(
      'das',
      'Obst',
      null,
      'fruit',
      'Ich kaufe Obst auf dem Markt.',
      'I buy fruit at the market.',
    ),
    noun('die', 'Suppe', 'Suppen', 'soup', 'Die Suppe ist heiß.', 'The soup is hot.'),
    noun('der', 'Salat', 'Salate', 'salad; lettuce'),
    noun('der', 'Saft', 'Säfte', 'juice', 'Ein Glas Saft, bitte.', 'A glass of juice, please.'),
    noun('das', 'Bier', 'Biere', 'beer', 'Ein Bier, bitte.', 'A beer, please.'),
    noun('der', 'Wein', 'Weine', 'wine'),
    noun('die', 'Tasse', 'Tassen', 'cup', 'Eine Tasse Tee, bitte.', 'A cup of tea, please.'),
    noun('das', 'Glas', 'Gläser', 'glass'),
    noun('die', 'Flasche', 'Flaschen', 'bottle', 'Die Flasche ist leer.', 'The bottle is empty.'),
    noun('der', 'Teller', 'Teller', 'plate'),
    noun(
      'das',
      'Restaurant',
      'Restaurants',
      'restaurant',
      'Das Restaurant ist gut.',
      'The restaurant is good.',
    ),
    noun('die', 'Rechnung', 'Rechnungen', 'bill', 'Die Rechnung, bitte.', 'The bill, please.'),
    noun('der', 'Hunger', null, 'hunger', 'Ich habe Hunger.', "I'm hungry."),
    noun('der', 'Durst', null, 'thirst', 'Ich habe Durst.', "I'm thirsty."),
  ] satisfies SeedCard[]
})()

const home = (() => {
  const { noun } = group('A1 · Home')
  return [
    noun('das', 'Bad', 'Bäder', 'bathroom; bath', 'Das Bad ist klein.', 'The bathroom is small.'),
    noun('das', 'Schlafzimmer', 'Schlafzimmer', 'bedroom'),
    noun('das', 'Wohnzimmer', 'Wohnzimmer', 'living room'),
    noun('der', 'Garten', 'Gärten', 'garden', 'Der Garten ist groß.', 'The garden is big.'),
    noun('der', 'Balkon', 'Balkone', 'balcony'),
    noun('der', 'Schlüssel', 'Schlüssel', 'key', 'Wo ist mein Schlüssel?', 'Where is my key?'),
    noun(
      'der',
      'Computer',
      'Computer',
      'computer',
      'Der Computer ist neu.',
      'The computer is new.',
    ),
    noun('das', 'Telefon', 'Telefone', 'telephone'),
    noun('der', 'Schrank', 'Schränke', 'cupboard; wardrobe'),
    noun(
      'die',
      'Adresse',
      'Adressen',
      'address',
      'Wie ist deine Adresse?',
      'What is your address?',
    ),
  ] satisfies SeedCard[]
})()

const city = (() => {
  const { noun, other } = group('A1 · City and travel')
  return [
    noun(
      'die',
      'Post',
      null,
      'post office; mail',
      'Die Post ist neben der Bank.',
      'The post office is next to the bank.',
    ),
    noun('die', 'Bank', 'Banken', 'bank (financial)'),
    noun('der', 'Supermarkt', 'Supermärkte', 'supermarket'),
    noun('die', 'Apotheke', 'Apotheken', 'pharmacy'),
    noun('das', 'Krankenhaus', 'Krankenhäuser', 'hospital'),
    noun('der', 'Park', 'Parks', 'park', 'Wir gehen in den Park.', "We're going to the park."),
    noun('der', 'Platz', 'Plätze', 'square; seat; place'),
    noun('das', 'Kino', 'Kinos', 'cinema'),
    noun('das', 'Hotel', 'Hotels', 'hotel'),
    noun(
      'der',
      'Flughafen',
      'Flughäfen',
      'airport',
      'Der Flughafen ist weit.',
      'The airport is far.',
    ),
    noun(
      'das',
      'Fahrrad',
      'Fahrräder',
      'bicycle',
      'Ich fahre mit dem Fahrrad.',
      "I'm going by bike.",
    ),
    noun('die', 'U-Bahn', 'U-Bahnen', 'subway; metro'),
    noun(
      'die',
      'Haltestelle',
      'Haltestellen',
      'stop (bus, tram)',
      'Die Haltestelle ist da vorne.',
      'The stop is just ahead.',
    ),
    noun('die', 'Fahrkarte', 'Fahrkarten', 'ticket (transport)'),
    noun('die', 'Reise', 'Reisen', 'trip; journey', 'Die Reise war lang.', 'The trip was long.'),
    noun(
      'der',
      'Urlaub',
      'Urlaube',
      'vacation',
      'Ich mache Urlaub in Berlin.',
      "I'm on vacation in Berlin.",
    ),
    other(
      'Deutschland',
      'Germany',
      'Ich lerne Deutsch für Deutschland.',
      "I'm learning German for Germany.",
    ),
    other('Österreich', 'Austria'),
    noun('die', 'Schweiz', null, 'Switzerland'),
  ] satisfies SeedCard[]
})()

const shopping = (() => {
  const { noun } = group('A1 · Shopping and clothes')
  return [
    noun('der', 'Laden', 'Läden', 'shop'),
    noun('der', 'Markt', 'Märkte', 'market'),
    noun('der', 'Preis', 'Preise', 'price', 'Der Preis ist hoch.', 'The price is high.'),
    noun('der', 'Euro', 'Euro', 'euro', 'Das kostet zehn Euro.', 'That costs ten euros.'),
    noun('die', 'Tasche', 'Taschen', 'bag', 'Die Tasche ist schwer.', 'The bag is heavy.'),
    noun('die', 'Hose', 'Hosen', 'pants; trousers'),
    noun('das', 'Hemd', 'Hemden', 'shirt'),
    noun('das', 'Kleid', 'Kleider', 'dress'),
    noun('die', 'Jacke', 'Jacken', 'jacket'),
    noun('der', 'Schuh', 'Schuhe', 'shoe'),
    noun('die', 'Farbe', 'Farben', 'color', 'Welche Farbe magst du?', 'Which color do you like?'),
    noun(
      'das',
      'Geschenk',
      'Geschenke',
      'gift',
      'Das Geschenk ist für dich.',
      'The gift is for you.',
    ),
  ] satisfies SeedCard[]
})()

const work = (() => {
  const { noun } = group('A1 · Work and school')
  return [
    noun('der', 'Beruf', 'Berufe', 'profession', 'Was ist dein Beruf?', 'What is your job?'),
    noun('die', 'Firma', 'Firmen', 'company'),
    noun('das', 'Büro', 'Büros', 'office', 'Ich bin im Büro.', "I'm at the office."),
    noun('der', 'Chef', 'Chefs', 'boss (male)'),
    noun(
      'der',
      'Lehrer',
      'Lehrer',
      'teacher (male)',
      'Der Lehrer erklärt die Aufgabe.',
      'The teacher explains the task.',
    ),
    noun('die', 'Lehrerin', 'Lehrerinnen', 'teacher (female)'),
    noun('der', 'Student', 'Studenten', 'student (male, university)'),
    noun(
      'die',
      'Studentin',
      'Studentinnen',
      'student (female, university)',
      'Sie ist Studentin.',
      "She's a student.",
    ),
    noun('der', 'Arzt', 'Ärzte', 'doctor (male)', 'Ich gehe zum Arzt.', "I'm going to the doctor."),
    noun('die', 'Ärztin', 'Ärztinnen', 'doctor (female)'),
    noun(
      'der',
      'Kurs',
      'Kurse',
      'course',
      'Der Kurs beginnt am Montag.',
      'The course starts on Monday.',
    ),
    noun('die', 'Klasse', 'Klassen', 'class'),
    noun(
      'die',
      'Prüfung',
      'Prüfungen',
      'exam',
      'Morgen habe ich eine Prüfung.',
      'Tomorrow I have an exam.',
    ),
    noun(
      'die',
      'Hausaufgabe',
      'Hausaufgaben',
      'homework assignment',
      'Ich mache meine Hausaufgaben.',
      "I'm doing my homework.",
    ),
    noun('die', 'E-Mail', 'E-Mails', 'email'),
  ] satisfies SeedCard[]
})()

const body = (() => {
  const { noun } = group('A1 · Body')
  return [
    noun('der', 'Kopf', 'Köpfe', 'head', 'Mein Kopf tut weh.', 'My head hurts.'),
    noun('das', 'Auge', 'Augen', 'eye'),
    noun('das', 'Ohr', 'Ohren', 'ear'),
    noun('die', 'Nase', 'Nasen', 'nose'),
    noun('der', 'Mund', 'Münder', 'mouth'),
    noun('der', 'Arm', 'Arme', 'arm'),
    noun('die', 'Hand', 'Hände', 'hand', 'Gib mir deine Hand.', 'Give me your hand.'),
    noun('das', 'Bein', 'Beine', 'leg'),
    noun('der', 'Fuß', 'Füße', 'foot', 'Ich gehe zu Fuß.', "I'm going on foot."),
    noun('der', 'Bauch', 'Bäuche', 'belly; stomach'),
    noun('das', 'Herz', 'Herzen', 'heart'),
    noun('das', 'Haar', 'Haare', 'hair'),
  ] satisfies SeedCard[]
})()

const weather = (() => {
  const { noun } = group('A1 · Weather and free time')
  return [
    noun(
      'das',
      'Wetter',
      null,
      'weather',
      'Wie ist das Wetter heute?',
      "What's the weather like today?",
    ),
    noun('die', 'Sonne', null, 'sun', 'Die Sonne scheint.', 'The sun is shining.'),
    noun('der', 'Regen', null, 'rain', 'Der Regen hört nicht auf.', "The rain won't stop."),
    noun('der', 'Schnee', null, 'snow'),
    noun('der', 'Wind', 'Winde', 'wind'),
    noun('der', 'Sommer', 'Sommer', 'summer', 'Im Sommer ist es heiß.', "It's hot in summer."),
    noun('der', 'Winter', 'Winter', 'winter', 'Im Winter ist es kalt.', "It's cold in winter."),
    noun('der', 'Frühling', 'Frühlinge', 'spring'),
    noun('der', 'Herbst', 'Herbste', 'autumn'),
    noun('die', 'Musik', null, 'music', 'Ich höre gern Musik.', 'I like listening to music.'),
    noun('der', 'Film', 'Filme', 'film', 'Der Film beginnt um acht.', 'The film starts at eight.'),
    noun('das', 'Spiel', 'Spiele', 'game', 'Das Spiel ist lustig.', 'The game is fun.'),
    noun('der', 'Sport', null, 'sport', 'Ich mache viel Sport.', 'I do a lot of sport.'),
    noun('das', 'Lied', 'Lieder', 'song', 'Das Lied ist schön.', 'The song is beautiful.'),
    noun(
      'das',
      'Wochenende',
      'Wochenenden',
      'weekend',
      'Am Wochenende schlafe ich lange.',
      'On the weekend I sleep in.',
    ),
  ] satisfies SeedCard[]
})()

const verbs = (() => {
  const { verb } = group('A1 · Verbs')
  return [
    verb('öffnen', 'to open', 'Ich öffne das Fenster.', "I'm opening the window."),
    verb('schließen', 'to close', 'Schließen Sie bitte die Tür.', 'Please close the door.'),
    verb('geben', 'to give', 'Gibst du mir das Buch?', 'Will you give me the book?'),
    verb('nehmen', 'to take', 'Ich nehme den Bus.', 'I take the bus.'),
    verb('finden', 'to find', 'Ich finde den Schlüssel nicht.', "I can't find the key."),
    verb('bleiben', 'to stay', 'Ich bleibe heute zu Hause.', "I'm staying home today."),
    verb('warten', 'to wait', 'Wir warten auf den Bus.', "We're waiting for the bus."),
    verb('helfen', 'to help', 'Sie hilft ihrer Mutter.', 'She helps her mother.'),
    verb('fragen', 'to ask', 'Ich frage den Lehrer.', "I'm asking the teacher."),
    verb('antworten', 'to answer', 'Er antwortet nicht.', "He doesn't answer."),
    verb('sagen', 'to say', 'Was sagst du?', 'What are you saying?'),
    verb('wissen', 'to know (a fact)', 'Ich weiß die Antwort.', 'I know the answer.'),
    verb('kennen', 'to know (a person or place)', 'Ich kenne ihn.', 'I know him.'),
    verb('denken', 'to think', 'Ich denke an dich.', "I'm thinking of you."),
    verb('liegen', 'to lie; to be located', 'Berlin liegt im Osten.', 'Berlin is in the east.'),
    verb('sitzen', 'to sit', 'Wir sitzen im Park.', "We're sitting in the park."),
    verb(
      'stehen',
      'to stand',
      'Das Auto steht vor dem Haus.',
      'The car is parked in front of the house.',
    ),
    verb('laufen', 'to run; to walk', 'Ich laufe zur Schule.', 'I walk to school.'),
    verb('aufstehen', 'to get up', 'Ich stehe um sieben auf.', 'I get up at seven.'),
    verb('anrufen', 'to call (phone)', 'Ich rufe dich morgen an.', "I'll call you tomorrow."),
    verb('einkaufen', 'to shop', 'Wir kaufen heute ein.', "We're shopping today."),
    verb('bestellen', 'to order', 'Ich bestelle eine Suppe.', "I'm ordering a soup."),
    verb('bezahlen', 'to pay', 'Ich bezahle mit Karte.', "I'm paying by card."),
    verb('kochen', 'to cook', 'Er kocht gern.', 'He likes cooking.'),
    verb('singen', 'to sing', 'Sie singt ein Lied.', 'She sings a song.'),
    verb('suchen', 'to look for', 'Ich suche meinen Schlüssel.', "I'm looking for my key."),
    verb('zeigen', 'to show', 'Zeigst du mir das Foto?', 'Will you show me the photo?'),
    verb('treffen', 'to meet', 'Ich treffe meine Freunde.', "I'm meeting my friends."),
    verb('besuchen', 'to visit', 'Wir besuchen Oma.', "We're visiting Grandma."),
    verb('wollen', 'to want', 'Ich will nach Hause.', 'I want to go home.'),
    verb('müssen', 'must; to have to', 'Ich muss arbeiten.', 'I have to work.'),
    verb('dürfen', 'to be allowed to', 'Darf ich hier sitzen?', 'May I sit here?'),
    verb('mögen', 'to like', 'Ich mag Tee.', 'I like tea.'),
  ] satisfies SeedCard[]
})()

const adjectives = (() => {
  const { other } = group('A1 · Adjectives and adverbs')
  return [
    other('schnell', 'fast', 'Der Zug ist schnell.', 'The train is fast.'),
    other('langsam', 'slow'),
    other('lang', 'long', 'Der Tag war lang.', 'The day was long.'),
    other('kurz', 'short'),
    other('heiß', 'hot', 'Der Kaffee ist heiß.', 'The coffee is hot.'),
    other('kalt', 'cold', 'Das Wasser ist kalt.', 'The water is cold.'),
    other('warm', 'warm'),
    other('billig', 'cheap'),
    other('teuer', 'expensive', 'Das Hotel ist teuer.', 'The hotel is expensive.'),
    other('richtig', 'right; correct', 'Das ist richtig.', "That's correct."),
    other('falsch', 'wrong; false'),
    other('leicht', 'easy; light', 'Die Aufgabe ist leicht.', 'The task is easy.'),
    other('schwer', 'difficult; heavy', 'Deutsch ist nicht schwer.', 'German is not difficult.'),
    other('jung', 'young'),
    other('müde', 'tired', 'Ich bin sehr müde.', "I'm very tired."),
    other('krank', 'sick', 'Mein Bruder ist krank.', 'My brother is sick.'),
    other('nett', 'nice; kind', 'Die Nachbarin ist nett.', 'The neighbor is nice.'),
    other('wichtig', 'important'),
    other('schlecht', 'bad', 'Das Wetter ist schlecht.', 'The weather is bad.'),
    other('rot', 'red', 'Der Apfel ist rot.', 'The apple is red.'),
    other('blau', 'blue'),
    other('grün', 'green'),
    other('gelb', 'yellow'),
    other('schwarz', 'black'),
    other('weiß', 'white'),
    other('jetzt', 'now', 'Jetzt gehen wir.', "We're leaving now."),
    other('immer', 'always', 'Er ist immer pünktlich.', "He's always on time."),
    other('nie', 'never', 'Ich trinke nie Bier.', 'I never drink beer.'),
    other('oft', 'often'),
    other('manchmal', 'sometimes', 'Manchmal esse ich Fisch.', 'Sometimes I eat fish.'),
    other('früh', 'early'),
    other('spät', 'late', 'Wie spät ist es?', 'What time is it?'),
    other('gestern', 'yesterday', 'Gestern war ich im Kino.', 'Yesterday I was at the cinema.'),
    other('auch', 'also; too', 'Ich komme auch.', "I'm coming too."),
    other('sehr', 'very', 'Das ist sehr gut.', "That's very good."),
    other('vielleicht', 'maybe'),
    other('links', 'left; on the left', 'Gehen Sie nach links.', 'Go left.'),
    other('rechts', 'right; on the right'),
    other('geradeaus', 'straight ahead', 'Gehen Sie geradeaus.', 'Go straight ahead.'),
    other('dort', 'there', 'Dort ist der Bahnhof.', 'The train station is over there.'),
    other('bald', 'soon'),
  ] satisfies SeedCard[]
})()

const basics = (() => {
  const { other } = group('A1 · Basics')
  return [
    other('ich', 'I', 'Ich bin Rainer.', "I'm Rainer."),
    other('du', 'you (informal)', 'Wie heißt du?', "What's your name?"),
    other('er', 'he', 'Er wohnt hier.', 'He lives here.'),
    other('sie', 'she; they', 'Sie kommt aus Manila.', 'She comes from Manila.'),
    other('es', 'it', 'Es ist spät.', "It's late."),
    other('wir', 'we', 'Wir lernen Deutsch.', "We're learning German."),
    other('ihr', 'you (plural, informal)', 'Wo wohnt ihr?', 'Where do you live?'),
    other('Sie', 'you (formal)', 'Wie heißen Sie?', "What's your name?"),
    other('und', 'and', 'Brot und Käse', 'bread and cheese'),
    other('oder', 'or', 'Kaffee oder Tee?', 'Coffee or tea?'),
    other('aber', 'but', 'Ich will, aber ich kann nicht.', "I want to, but I can't."),
    other(
      'weil',
      'because',
      'Ich bleibe zu Hause, weil ich krank bin.',
      "I'm staying home because I'm sick.",
    ),
    other('mit', 'with', 'Ich fahre mit dem Bus.', "I'm going by bus."),
    other('ohne', 'without', 'Kaffee ohne Zucker', 'coffee without sugar'),
    other('für', 'for', 'Das ist für dich.', "That's for you."),
    other('von', 'from; of', 'Das Buch ist von Anna.', "The book is Anna's."),
    other(
      'nach',
      'after; to (a place)',
      'Nach der Arbeit gehe ich nach Hause.',
      'After work I go home.',
    ),
    other('wer', 'who', 'Wer ist das?', 'Who is that?'),
    other('was', 'what', 'Was ist das?', 'What is that?'),
    other('wo', 'where', 'Wo wohnst du?', 'Where do you live?'),
    other('wann', 'when', 'Wann kommst du?', 'When are you coming?'),
    other('warum', 'why', 'Warum lernst du Deutsch?', 'Why are you learning German?'),
    other('wie', 'how', 'Wie geht es dir?', 'How are you?'),
    other('woher', 'from where', 'Woher kommst du?', 'Where are you from?'),
    other('wohin', 'to where', 'Wohin gehst du?', 'Where are you going?'),
  ] satisfies SeedCard[]
})()

export const topicCards: SeedCard[] = [
  ...timeAndNumbers,
  ...phrases,
  ...people,
  ...food,
  ...home,
  ...city,
  ...shopping,
  ...work,
  ...body,
  ...weather,
  ...verbs,
  ...adjectives,
  ...basics,
]
