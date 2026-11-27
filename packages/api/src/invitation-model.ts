// The invitation document shared by the API and the web app.
// Keep this file free of server-only imports: the web app imports it at runtime.
import { z } from 'zod'

export const langs = ['id', 'en'] as const
export type Lang = (typeof langs)[number]
type Copy = Record<Lang, string>

export const collections = ['klasik', 'ilustrasi', 'ceria'] as const
export type Collection = (typeof collections)[number]

export const themes = [
  {
    id: 'kawung',
    name: 'Kawung Senja',
    collection: 'klasik',
    blurb: {
      id: 'Batik kawung biru tua dan krem, amplop bersegel lilin emas dengan setangkai melati. Tenang, rapi, dan klasik.',
      en: 'Deep indigo kawung batik on cream. A gold wax-sealed envelope with a sprig of jasmine. Calm and classic.',
    },
  },
  {
    id: 'sawah',
    name: 'Sawah Pagi',
    collection: 'ilustrasi',
    blurb: {
      id: 'Terasering hijau saat matahari terbit, layang-layang di langit, dan amplop anyaman bambu. Hangat dan membumi.',
      en: 'Green rice terraces at sunrise, kites in the sky and a woven bamboo envelope. Warm and down to earth.',
    },
  },
  {
    id: 'kartu-pos',
    name: 'Kartu Pos',
    collection: 'ilustrasi',
    blurb: {
      id: 'Amplop pos udara bergaris merah biru, perangko berisi foto kalian, dan cap pos tanggal hari H. Untuk pasangan yang suka jalan.',
      en: 'A red and blue airmail envelope, stamps with your photos and a postmark on the big day. For couples who love to travel.',
    },
  },
  {
    id: 'pasar-malam',
    name: 'Pasar Malam',
    collection: 'ceria',
    blurb: {
      id: 'Lampu gantung, bianglala, dan tiket masuk sebagai amplop. Malam yang ramai untuk pesta yang seru.',
      en: 'String lights, a Ferris wheel and an admission ticket for an envelope. A lively night for a fun party.',
    },
  },
  {
    id: 'melati',
    name: 'Untai Melati',
    collection: 'klasik',
    blurb: {
      id: 'Gading dan hijau sage dengan untaian melati yang menjuntai. Lembut, bersih, dan anggun.',
      en: 'Ivory and sage with strands of jasmine. Soft, clean and graceful.',
    },
  },
  {
    id: 'kertas',
    name: 'Kertas Warna',
    collection: 'ceria',
    blurb: {
      id: 'Potongan kertas warna-warni, konfeti, dan amplop origami. Ceria dan penuh warna.',
      en: 'Cut paper in bright colours, confetti and an origami envelope. Cheerful and colourful.',
    },
  },
] as const satisfies readonly { id: string; name: string; collection: Collection; blurb: Copy }[]

export const themeIds = themes.map((theme) => theme.id) as unknown as readonly [ThemeId, ...ThemeId[]]
export type ThemeId = (typeof themes)[number]['id']
export const isThemeId = (value: string): value is ThemeId => themes.some((theme) => theme.id === value)

export const sectionIds = [
  'cover',
  'opening',
  'couple',
  'story',
  'qna',
  'events',
  'countdown',
  'gallery',
  'wishes',
  'dresscode',
  'gift',
  'film',
  'live',
  'booth',
  'camera',
  'notes',
  'thanks',
] as const
export type SectionId = (typeof sectionIds)[number]

export type FieldKind = 'text' | 'long' | 'photo' | 'color' | 'link'
export type FieldDef = {
  key: string
  label: string
  kind: FieldKind
  /** Real wording that guests see when the creator leaves the field alone. */
  default?: Copy
  /** Shown only in previews, with a "Contoh" badge, until the creator fills the field. */
  sample?: Copy
  /** Hidden until the creator turns it on. */
  off?: boolean
  max?: number
  /** Fields with the same group render together in the editor. */
  group?: string
}
export type SectionDef = {
  id: SectionId
  label: string
  /** Sections that can be turned off. */
  optional: boolean
  hint?: string
  fields: FieldDef[]
}

const t = (key: string, label: string, def: Copy, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  kind: 'text',
  default: def,
  ...extra,
})
const s = (key: string, label: string, sample: Copy, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  kind: 'text',
  sample,
  ...extra,
})
const photo = (key: string, label: string, sample: string, group?: string): FieldDef => ({
  key,
  label,
  kind: 'photo',
  sample: { id: sample, en: sample },
  group,
})

const storySamples: [Copy, Copy][] = [
  [
    { id: '2019 · Pertama bertemu', en: '2019 · First meeting' },
    {
      id: 'Satu payung berdua di halte Dago. Payungnya dikembalikan seminggu kemudian, bersama sekotak stroberi.',
      en: 'One umbrella for two at a bus stop in Dago. It came back a week later with a box of strawberries.',
    },
  ],
  [
    { id: '2021 · Jarak', en: '2021 · Distance' },
    {
      id: 'Bandung dan Makassar, dua zona waktu, dan telepon setiap malam pukul sembilan.',
      en: 'Bandung and Makassar, two time zones, and a phone call every night at nine.',
    },
  ],
  [
    { id: '2024 · Lamaran', en: '2024 · The proposal' },
    {
      id: 'Di warung kopi tempat semuanya dimulai, dengan cincin yang disembunyikan di kotak gula.',
      en: 'At the coffee stall where it all began, with a ring hidden in the sugar box.',
    },
  ],
  [
    { id: '2027 · Hari ini', en: '2027 · Today' },
    {
      id: 'Babak baru yang ingin kami rayakan bersamamu.',
      en: 'A new chapter we want to celebrate with you.',
    },
  ],
]

const qnaDefaults: [Copy, Copy][] = [
  [
    { id: 'Siapa yang bilang sayang duluan?', en: 'Who said "I love you" first?' },
    { id: 'Bima, di parkiran pasar.', en: 'Bima, in a market parking lot.' },
  ],
  [
    { id: 'Liburan pertama berdua?', en: 'Our first trip together?' },
    { id: 'Dieng, kabut, dan mi ongklok.', en: 'Dieng, fog and mi ongklok.' },
  ],
  [
    { id: 'Siapa yang masak di rumah?', en: 'Who does the cooking?' },
    { id: 'Sekar masak, Bima cuci piring.', en: 'Sekar cooks, Bima washes up.' },
  ],
  [
    { id: 'Lagu kami?', en: 'Our song?' },
    { id: '"Dan" dari Sheila on 7.', en: '"Dan" by Sheila on 7.' },
  ],
]

const noteDefaults: [Copy, Copy, boolean][] = [
  [
    { id: 'Kedatangan', en: 'Arriving' },
    { id: 'Pintu dibuka 30 menit sebelum akad.', en: 'Doors open 30 minutes before the ceremony.' },
    false,
  ],
  [
    { id: 'Parkir', en: 'Parking' },
    { id: 'Parkir tersedia di gedung sebelah barat.', en: 'Parking is in the building to the west.' },
    false,
  ],
  [
    { id: 'Musala', en: 'Prayer room' },
    { id: 'Musala ada di lantai dasar, dekat lobi.', en: 'The prayer room is on the ground floor by the lobby.' },
    false,
  ],
  [
    { id: 'Anak-anak', en: 'Little ones' },
    {
      id: 'Anak-anak sangat diterima. Ada pojok main di dekat taman.',
      en: 'Children are welcome. There is a play corner by the garden.',
    },
    true,
  ],
  [
    { id: 'Tanpa gawai', en: 'Unplugged' },
    {
      id: 'Saat akad, simpan dulu ponselmu. Fotografer kami yang akan mengabadikan.',
      en: 'During the ceremony, please put your phone away. Our photographer has it covered.',
    },
    true,
  ],
  [
    { id: 'Hadiah', en: 'Gifts' },
    {
      id: 'Doamu sudah cukup. Kalau ingin memberi, lihat bagian hadiah.',
      en: 'Your prayers are enough. If you wish to give, see the gift section.',
    },
    true,
  ],
]

export const sections: SectionDef[] = [
  {
    id: 'cover',
    label: 'Sampul',
    optional: false,
    hint: 'Yang pertama dilihat tamu sebelum membuka undangan.',
    fields: [
      t('kicker', 'Kicker', { id: 'Undangan pernikahan', en: 'The wedding of' }),
      t('names', 'Nama', { id: '@wanita & @pria', en: '@bride & @groom' }),
      t('guestLabel', 'Sapaan tamu', { id: 'Kepada', en: 'Dear' }),
      t('button', 'Tombol', { id: 'Buka undangan', en: 'Open invitation' }),
    ],
  },
  {
    id: 'opening',
    label: 'Pembuka',
    optional: false,
    fields: [
      t('kicker', 'Kicker', { id: 'Pernikahan', en: 'The wedding of' }),
      t('names', 'Nama', { id: '@wanita & @pria', en: '@bride & @groom' }),
      s('place', 'Tempat', { id: 'Lembang, Bandung', en: 'Lembang, Bandung' }),
      t('greeting', 'Sapaan', {
        id: 'Bersama keluarga, kami mengundangmu',
        en: 'Together with our families, we invite you',
      }),
    ],
  },
  {
    id: 'couple',
    label: 'Mempelai',
    optional: false,
    fields: [
      t(
        'greeting',
        'Pembuka',
        {
          id: 'Dengan penuh syukur, kami mengundangmu merayakan hari kami memulai hidup bersama.',
          en: 'With grateful hearts, we invite you to celebrate the day we begin our life together.',
        },
        { kind: 'long' },
      ),
      s(
        'verse',
        'Kutipan',
        {
          id: '"Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan untukmu dari jenismu sendiri."',
          en: '"And among His signs is that He created for you mates from among yourselves."',
        },
        { kind: 'long' },
      ),
      s('verseSource', 'Sumber kutipan', { id: 'Ar-Rum 21', en: 'Ar-Rum 21' }),
      t('kicker', 'Kicker', { id: 'Mempelai', en: 'The bride & groom' }),
      t('title', 'Judul', { id: 'Kami berdua', en: 'The two of us' }),
      photo('bride.photo', 'Foto mempelai wanita', 'sample:bride', 'bride'),
      t('bride.name', 'Nama panggilan', { id: '@wanita', en: '@bride' }, { group: 'bride' }),
      s('bride.full', 'Nama lengkap', { id: 'Sekar Ayu Larasati', en: 'Sekar Ayu Larasati' }, { group: 'bride' }),
      s(
        'bride.parents',
        'Orang tua',
        { id: 'Putri dari Bapak Sutrisno & Ibu Wahyuni', en: 'Daughter of Mr. Sutrisno & Mrs. Wahyuni' },
        { group: 'bride' },
      ),
      s('bride.ig', 'Instagram', { id: '@sekar.ayu', en: '@sekar.ayu' }, { group: 'bride' }),
      photo('groom.photo', 'Foto mempelai pria', 'sample:groom', 'groom'),
      t('groom.name', 'Nama panggilan', { id: '@pria', en: '@groom' }, { group: 'groom' }),
      s('groom.full', 'Nama lengkap', { id: 'Bima Pratama', en: 'Bima Pratama' }, { group: 'groom' }),
      s(
        'groom.parents',
        'Orang tua',
        { id: 'Putra dari Bapak Hartono & Ibu Ratna', en: 'Son of Mr. Hartono & Mrs. Ratna' },
        { group: 'groom' },
      ),
      s('groom.ig', 'Instagram', { id: '@bima.pratama', en: '@bima.pratama' }, { group: 'groom' }),
    ],
  },
  {
    id: 'story',
    label: 'Cerita Kami',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Cerita kami', en: 'Our story' }),
      t('title', 'Judul', { id: 'Awal mula', en: 'How it began' }),
      ...storySamples.flatMap(([year, text], index) => [
        photo(`s${index + 1}.photo`, `Bab ${index + 1}: foto`, `sample:story-${index + 1}`, `s${index + 1}`),
        s(`s${index + 1}.year`, `Bab ${index + 1}: tahun`, year, { group: `s${index + 1}` }),
        s(`s${index + 1}.text`, `Bab ${index + 1}: cerita`, text, { kind: 'long', group: `s${index + 1}` }),
      ]),
    ],
  },
  {
    id: 'qna',
    label: 'Hal Kecil',
    optional: true,
    hint: 'Kartu tanya jawab yang dibuka tamu dengan sekali ketuk.',
    fields: [
      t('kicker', 'Kicker', { id: 'Hal-hal kecil', en: 'Little things' }),
      t('title', 'Judul', { id: 'Tentang kami', en: 'About us' }),
      ...qnaDefaults.flatMap(([question, answer], index) => [
        t(`q${index + 1}.q`, `Kartu ${index + 1}: pertanyaan`, question, { group: `q${index + 1}` }),
        s(`q${index + 1}.a`, `Kartu ${index + 1}: jawaban`, answer, { group: `q${index + 1}` }),
      ]),
    ],
  },
  {
    id: 'events',
    label: 'Acara',
    optional: false,
    hint: 'Tanggal di bagian lain undangan mengikuti acara pertama.',
    fields: [
      t('kicker', 'Kicker', { id: 'Waktu & tempat', en: 'When & where' }),
      t('title', 'Judul', { id: 'Acara', en: 'Events' }),
    ],
  },
  {
    id: 'countdown',
    label: 'Hitung Mundur',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Menghitung hari', en: 'Counting the days' }),
      t('title', 'Judul', { id: 'Menuju hari bahagia', en: 'Until the big day' }),
      t('button', 'Tombol', { id: 'Simpan tanggal', en: 'Save the date' }),
    ],
  },
  {
    id: 'gallery',
    label: 'Galeri',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Momen', en: 'Moments' }),
      t('title', 'Judul', { id: 'Galeri', en: 'Gallery' }),
    ],
  },
  {
    id: 'wishes',
    label: 'Ucapan & RSVP',
    optional: true,
    hint: 'Tamu dengan link pribadi bisa konfirmasi hadir. Semua tamu bisa menulis ucapan.',
    fields: [
      t('kicker', 'Kicker', { id: 'Mohon konfirmasi', en: 'Kindly reply' }),
      t('title', 'Judul', { id: 'Ucapan & doa', en: 'Wishes' }),
      t('button', 'Tombol hadir', { id: 'Ya, saya hadir', en: 'Yes, I will attend' }),
    ],
  },
  {
    id: 'dresscode',
    label: 'Dress Code',
    optional: true,
    hint: 'Tamu bisa mengetuk warna untuk menyalin kodenya.',
    fields: [
      t('kicker', 'Kicker', { id: 'Busana', en: 'What to wear' }),
      t('title', 'Judul', { id: 'Dress code', en: 'Dress code' }),
      t(
        'note',
        'Catatan',
        {
          id: 'Batik atau kain dengan warna lembut. Sepatu nyaman untuk rumput.',
          en: 'Batik or soft colours. Comfortable shoes for the grass.',
        },
        { kind: 'long' },
      ),
      ...[1, 2, 3, 4].flatMap((index) => [
        t(
          `c${index}.hex`,
          `Warna ${index}`,
          { id: `theme:${index}`, en: `theme:${index}` },
          { kind: 'color', group: `c${index}` },
        ),
        t(
          `c${index}.name`,
          `Nama warna ${index}`,
          { id: `theme:${index}`, en: `theme:${index}` },
          { group: `c${index}` },
        ),
      ]),
    ],
  },
  {
    id: 'gift',
    label: 'Hadiah',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Tanda kasih', en: 'Wedding gift' }),
      t('title', 'Judul', { id: 'Hadiah', en: 'With love' }),
      t(
        'subtitle',
        'Keterangan',
        {
          id: 'Kehadiranmu sudah jadi hadiah. Jika ingin memberi lebih:',
          en: 'Your presence is the gift. Should you wish to send something more:',
        },
        { kind: 'long' },
      ),
      ...[1, 2].flatMap((index) => [
        s(
          `a${index}.bank`,
          `Rekening ${index}: bank`,
          index === 1 ? { id: 'BCA', en: 'BCA' } : { id: 'Mandiri', en: 'Mandiri' },
          {
            group: `a${index}`,
          },
        ),
        s(
          `a${index}.number`,
          `Rekening ${index}: nomor`,
          index === 1 ? { id: '1234 5678 90', en: '1234 5678 90' } : { id: '0987 6543 21', en: '0987 6543 21' },
          { group: `a${index}` },
        ),
        s(
          `a${index}.holder`,
          `Rekening ${index}: atas nama`,
          index === 1
            ? { id: 'Sekar Ayu Larasati', en: 'Sekar Ayu Larasati' }
            : { id: 'Bima Pratama', en: 'Bima Pratama' },
          { group: `a${index}` },
        ),
      ]),
      t('addressLabel', 'Label alamat', { id: 'Alamat kirim hadiah', en: 'Gift address' }),
      s(
        'address',
        'Alamat',
        { id: 'Jl. Raya Lembang 81, Bandung', en: 'Jl. Raya Lembang 81, Bandung' },
        { kind: 'long' },
      ),
    ],
  },
  {
    id: 'film',
    label: 'Film Pre-wedding',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Cerita dalam film', en: 'Our story on film' }),
      t('title', 'Judul', { id: 'Film pre-wedding', en: 'Pre-wedding film' }),
      photo('still', 'Cuplikan film', 'sample:film'),
      s('youtube', 'Link YouTube', { id: 'https://youtu.be/', en: 'https://youtu.be/' }, { kind: 'link' }),
      t('note', 'Catatan', { id: 'Ketuk untuk memutar', en: 'Tap to play' }),
    ],
  },
  {
    id: 'live',
    label: 'Siaran Langsung',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Siaran langsung', en: 'Live streaming' }),
      t('title', 'Judul', { id: 'Ikut dari jauh', en: 'Join from afar' }),
      t(
        'subtitle',
        'Keterangan',
        {
          id: 'Tidak bisa datang? Saksikan acaranya secara langsung dari mana saja.',
          en: "Can't be there in person? Watch the celebration live, wherever you are.",
        },
        { kind: 'long' },
      ),
      s('link', 'Link siaran', { id: 'https://youtube.com/live', en: 'https://youtube.com/live' }, { kind: 'link' }),
      t('button', 'Tombol', { id: 'Tonton siaran', en: 'Watch live' }),
    ],
  },
  {
    id: 'booth',
    label: 'Photobooth',
    optional: true,
    hint: 'Bagian ini hanya menampilkan tombol untuk tamu. Frame dan jadwal buka diatur di tab Booth.',
    fields: [
      t('kicker', 'Kicker', { id: 'Photobooth', en: 'Photobooth' }),
      t('title', 'Judul', { id: 'Ayo berpose', en: 'Strike a pose' }),
      photo('p1', 'Foto strip 1', 'sample:booth-1', 'strip'),
      photo('p2', 'Foto strip 2', 'sample:booth-2', 'strip'),
      photo('p3', 'Foto strip 3', 'sample:booth-3', 'strip'),
      t(
        'subtitle',
        'Keterangan',
        {
          id: 'Photobooth virtual kami buka di hari acara. Ambil foto strip dari ponselmu sendiri.',
          en: 'Our virtual photobooth opens on the day. Take a photo strip on your own phone.',
        },
        { kind: 'long' },
      ),
      t('button', 'Tombol', { id: 'Buka photobooth', en: 'Open photobooth' }),
    ],
  },
  {
    id: 'camera',
    label: 'Kamera',
    optional: true,
    hint: 'Bagian ini hanya menampilkan tombol untuk tamu. Film dan waktu buka album diatur di tab Kamera.',
    fields: [
      t('kicker', 'Kicker', { id: 'Kamera sekali pakai', en: 'Disposable camera' }),
      t('title', 'Judul', { id: 'Rol bersama', en: 'Our shared roll' }),
      photo('p1', 'Cetakan 1', 'sample:print-1', 'prints'),
      photo('p2', 'Cetakan 2', 'sample:print-2', 'prints'),
      photo('p3', 'Cetakan 3', 'sample:print-3', 'prints'),
      t(
        'subtitle',
        'Keterangan',
        {
          id: 'Ambil satu rol isi 24 jepretan. Tanpa preview, semua foto dicuci jadi album kami.',
          en: 'Take a roll of 24 shots. No preview, every frame develops into our album.',
        },
        { kind: 'long' },
      ),
      t('button', 'Tombol', { id: 'Ambil rol film', en: 'Get a camera roll' }),
    ],
  },
  {
    id: 'notes',
    label: 'Perlu Diketahui',
    optional: true,
    fields: [
      t('kicker', 'Kicker', { id: 'Perlu diketahui', en: 'Good to know' }),
      t('title', 'Judul', { id: 'Catatan kecil', en: 'A few notes' }),
      ...noteDefaults.flatMap(([title, text, off], index) => [
        t(`n${index + 1}.title`, `Catatan ${index + 1}: judul`, title, { group: `n${index + 1}`, off }),
        s(`n${index + 1}.text`, `Catatan ${index + 1}: isi`, text, { kind: 'long', group: `n${index + 1}`, off }),
      ]),
    ],
  },
  {
    id: 'thanks',
    label: 'Terima Kasih',
    optional: true,
    fields: [
      photo('photo', 'Foto penutup', 'sample:thanks'),
      t('title', 'Judul', { id: 'Terima kasih', en: 'Thank you' }),
      t('line', 'Kalimat penutup', {
        id: 'Atas doa, kehadiran, dan kasihmu.',
        en: 'For your prayers, your presence and your love.',
      }),
      t('names', 'Nama', { id: '@wanita & @pria', en: '@bride & @groom' }),
    ],
  },
]

export const sectionById = Object.fromEntries(sections.map((section) => [section.id, section])) as Record<
  SectionId,
  SectionDef
>

export const timezones = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const
export const timezoneLabel: Record<(typeof timezones)[number], string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
}
export const maxEvents = 3
export const maxGallery = 20
export const recordings = ['gymnopedie', 'thinking-of-you', 'love-away', 'selepas-senja'] as const

const webLink = z.union([z.url({ protocol: /^https?$/ }).max(600), z.literal('')])

export const invitationEvent = z.object({
  id: z.string().min(1).max(40),
  title: z.string().max(80),
  date: z.union([z.iso.date(), z.literal('')]),
  start: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]),
  end: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]),
  untilDone: z.boolean(),
  tz: z.enum(timezones),
  venue: z.string().max(160),
  address: z.string().max(300),
  maps: webLink,
})
export type InvitationEvent = z.infer<typeof invitationEvent>

export const invitationMusicChoice = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('theme') }),
  z.object({ mode: z.literal('off') }),
  z.object({ mode: z.literal('recording'), id: z.enum(recordings) }),
  z.object({
    mode: z.literal('upload'),
    mediaId: z.uuid(),
    title: z.string().max(120),
    start: z.number().min(0).max(3600),
    end: z.number().min(0).max(3600).optional(),
  }),
])
export type InvitationMusicChoice = z.infer<typeof invitationMusicChoice>

const valueKey = z
  .string()
  .regex(/^[a-z]+\.[a-z0-9.]+$/i)
  .max(40)

export const invitationDoc = z.object({
  v: z.literal(1),
  kind: z.literal('wedding'),
  theme: z.enum(themeIds),
  lang: z.enum(langs),
  names: z.object({ bride: z.string().max(40), groom: z.string().max(40) }),
  events: z.array(invitationEvent).max(maxEvents),
  /** Creator text, photo ids and colours, keyed `section.field`. Missing keys use the default. */
  values: z.record(valueKey, z.string().max(2000)).refine((values) => Object.keys(values).length <= 240),
  /** Field visibility the creator changed, keyed `section.field`. */
  show: z.record(valueKey, z.boolean()).refine((values) => Object.keys(values).length <= 240),
  /** Optional sections the creator turned off. */
  off: z.array(z.enum(sectionIds)).max(sectionIds.length),
  /** The order of the sections between the opening and the thank you, as dragged in the studio. */
  order: z.array(z.enum(sectionIds)).max(sectionIds.length).optional(),
  gallery: z.array(z.uuid()).max(maxGallery),
  music: invitationMusicChoice,
})
export type InvitationDoc = z.infer<typeof invitationDoc>

export function newInvitation(input: { theme: ThemeId; lang: Lang; bride: string; groom: string }): InvitationDoc {
  return {
    v: 1,
    kind: 'wedding',
    theme: input.theme,
    lang: input.lang,
    names: { bride: input.bride, groom: input.groom },
    events: [],
    values: {},
    show: {},
    off: [],
    gallery: [],
    music: { mode: 'theme' },
  }
}

export function newEvent(index: number): InvitationEvent {
  return {
    id: `e${Date.now().toString(36)}${index}`,
    title: index === 0 ? 'Akad nikah' : index === 1 ? 'Resepsi' : 'Acara',
    date: '',
    start: '',
    end: '',
    untilDone: false,
    tz: 'Asia/Jakarta',
    venue: '',
    address: '',
    maps: '',
  }
}

/** A full sample, used by the theme gallery and by the demo. */
export function sampleInvitation(theme: ThemeId, lang: Lang = 'id'): InvitationDoc {
  return {
    ...newInvitation({ theme, lang, bride: 'Sekar', groom: 'Bima' }),
    events: [
      {
        id: 'akad',
        title: lang === 'id' ? 'Akad nikah' : 'Ceremony',
        date: '2027-06-12',
        start: '08:00',
        end: '10:00',
        untilDone: false,
        tz: 'Asia/Jakarta',
        venue: 'Masjid Al-Ukhuwah',
        address: 'Jl. Wastukencana 27, Bandung',
        maps: 'https://maps.google.com/?q=Masjid+Al-Ukhuwah+Bandung',
      },
      {
        id: 'resepsi',
        title: lang === 'id' ? 'Resepsi' : 'Reception',
        date: '2027-06-12',
        start: '11:00',
        end: '14:00',
        untilDone: false,
        tz: 'Asia/Jakarta',
        venue: 'Kebun Bunga Lembang',
        address: 'Jl. Raya Lembang 81, Bandung',
        maps: 'https://maps.google.com/?q=Lembang+Bandung',
      },
    ],
  }
}

export type FieldMode = 'preview' | 'live'
export type ResolvedField = { value: string; sample: boolean; visible: boolean; filled: boolean }

export function fieldDef(section: SectionId, key: string) {
  return sectionById[section].fields.find((field) => field.key === key)
}

export function fillNames(text: string, doc: Pick<InvitationDoc, 'names'>) {
  const bride = doc.names.bride.trim() || 'Wanita'
  const groom = doc.names.groom.trim() || 'Pria'
  return text.replace(/@(wanita|bride|pria|groom)\b/gi, (match) => (/wanita|bride/i.test(match) ? bride : groom))
}

/**
 * What a field shows. Previews fall back to the theme's sample with a badge.
 * Live invitations show only real wording: defaults and what the creator typed.
 */
export function resolveField(doc: InvitationDoc, section: SectionId, key: string, mode: FieldMode): ResolvedField {
  const def = fieldDef(section, key)
  const id = `${section}.${key}`
  const visible = doc.show[id] ?? !def?.off
  const typed = doc.values[id]?.trim()
  if (typed) return { value: fillNames(typed, doc), sample: false, visible, filled: true }
  if (def?.default) return { value: fillNames(def.default[doc.lang], doc), sample: false, visible, filled: true }
  if (def?.sample && mode === 'preview') return { value: def.sample[doc.lang], sample: true, visible, filled: false }
  return { value: '', sample: false, visible, filled: false }
}

const pinned: SectionId[] = ['cover', 'opening', 'thanks']
export const movableSections = sectionIds.filter((id) => !pinned.includes(id))

/** Sections in display order: the opening first, the thank you last, the rest as the creator arranged them. */
export function sectionOrder(doc: Pick<InvitationDoc, 'order'>): SectionId[] {
  const chosen = (doc.order ?? []).filter((id, index, all) => movableSections.includes(id) && all.indexOf(id) === index)
  return ['opening', ...chosen, ...movableSections.filter((id) => !chosen.includes(id)), 'thanks']
}

export function isSectionOn(doc: InvitationDoc, section: SectionId) {
  return !sectionById[section].optional || !doc.off.includes(section)
}

/** Fields guests will not see until the creator fills them. Used for the "needs your details" badges. */
export function missingFields(doc: InvitationDoc, section: SectionId) {
  const def = sectionById[section]
  const missing = def.fields.filter((field) => {
    if (!field.sample) return false
    const resolved = resolveField(doc, section, field.key, 'live')
    return resolved.visible && !resolved.filled
  })
  if (section === 'events' && !doc.events.some((event) => event.date && event.start)) return missing.length + 1
  if (section === 'gallery' && doc.gallery.length === 0) return missing.length + 1
  return missing.length
}

export function publishProblems(doc: InvitationDoc) {
  const problems: string[] = []
  if (!doc.names.bride.trim() || !doc.names.groom.trim()) problems.push('Isi nama panggilan kedua mempelai.')
  if (!doc.events.some((event) => event.date && event.start && event.title.trim()))
    problems.push('Tambahkan minimal satu acara lengkap dengan tanggal dan jam mulai.')
  return problems
}

/** Events a guest should see. `null` means every event. */
export function eventsFor(doc: InvitationDoc, only: string[] | null) {
  if (!only?.length) return doc.events
  const visible = doc.events.filter((event) => only.includes(event.id))
  return visible.length ? visible : doc.events
}
