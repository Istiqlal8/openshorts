/* Guide pages: pricing, self-hosting, the free-plan comparison and the
 * "how to clip a YouTube video" guide.
 *
 * Every price, minute and limit on these pages is read from data.js. Where a
 * fact had to be transcribed into a structured field (the free-plan table), the
 * transcription is checked against the data.js wording at build time, so a
 * change in data.js that the table no longer matches fails the build instead of
 * shipping a stale number.
 */

import { SITE, COMPETITORS, EDITIONS, PRICE_MODELS, PIPELINE_STEPS } from './data.js'
import { costCalculator, priceFor } from './components.js'
import { esc } from './render.js'

const PUBLISHED = '2026-10-28'

const faqBlock = (faq) =>
  `<h2>Common questions</h2><dl class="faq">${faq
    .map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`)
    .join('')}</dl>`

const sources = (items) =>
  `<h2>Sources</h2><ul class="sources">${items.map((s) => `<li>${s}</li>`).join('')}</ul>`

/* Build-time guard: a transcribed fact must still appear in its data.js text. */
function assertIn(text, needle, where) {
  if (!String(text).toLowerCase().includes(String(needle).toLowerCase())) {
    throw new Error(`[guide-pages] ${where}: data.js no longer says "${needle}". Update guide-pages.js.`)
  }
}

const money = (n) => (n === 0 ? '$0' : `$${n % 1 ? n.toFixed(2) : n}`)
const monthName = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/* ---------------------------------------------------------------- pricing data */

const OS = PRICE_MODELS.openshorts
const osPlan = (name) => {
  const p = OS.plans.find((x) => x.name === name)
  if (!p) throw new Error(`[guide-pages] PRICE_MODELS.openshorts has no "${name}" plan`)
  return p
}
const FREE = osPlan('Free')
// Plan ids are the ones PricingSection.jsx and the Stripe lookup keys use.
const PAID = [
  ['starter', 'Starter', 'For getting started'],
  ['creator', 'Creator', 'For regular creators'],
  ['pro', 'Pro', 'For power users and teams'],
].map(([id, name, blurb]) => {
  const p = osPlan(name)
  return {
    id,
    name,
    blurb,
    minutes: p.monthly.minutes,
    monthly: p.monthly.price,
    yearlyPerMonth: p.yearly.price,
    yearlyTotal: Math.round(p.yearly.price * 12),
    perMinuteCents: Math.round((p.monthly.price / p.monthly.minutes) * 1000) / 10,
  }
})
const [STARTER, CREATOR, PRO] = PAID
const TOPUP_PRICE = osPlan('Pro + 200 min').monthly.price - PRO.monthly
const FIRST_VIDEO_MINUTES = 60
assertIn(EDITIONS.cloud.summary, `up to ${FIRST_VIDEO_MINUTES} minutes`, 'EDITIONS.cloud first video')
assertIn(EDITIONS.cloud.summary, 'about 50 seconds', 'EDITIONS.cloud GPU speed')
assertIn(EDITIONS.selfHosted.summary, '5 to 8 minutes', 'EDITIONS.selfHosted CPU speed')
if (FREE.monthly.minutes !== EDITIONS.cloud.freeMinutes) throw new Error('[guide-pages] free minutes disagree in data.js')
if (STARTER.monthly !== EDITIONS.cloud.lowPrice || PRO.monthly !== EDITIONS.cloud.highPrice) {
  throw new Error('[guide-pages] EDITIONS.cloud low/high price disagree with PRICE_MODELS')
}

const checkoutHref = (plan, yearly = false) =>
  `/#/pricing?plan=${plan}${yearly ? '&interval=year' : ''}&src=pricing_page`
const track = (label) =>
  ` onclick="window.op&amp;&amp;window.op('track','SeoCtaClick',{page:'/pricing',plan:'${label}'})"`
const btn = (href, label, trackAs, ghost = false) =>
  `<a class="${ghost ? 'btn-ghost' : 'btn-primary'}" href="${esc(href)}"${track(trackAs)}>${esc(label)}</a>`

/* ---------------------------------------------------------------------- /pricing */

const PRICING_FAQ = [
  {
    q: 'Is OpenShorts free?',
    a: `Two editions, two answers. OpenShorts self-hosted is free and open source under MIT, with no watermark and no cap; you run it with Docker and bring your own API keys. OpenShorts Cloud has a free plan (your first video clipped whole up to ${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} minutes a month, watermarked, no credit card) and paid plans from ${money(STARTER.monthly)}/month to ${money(PRO.monthly)}/month without a watermark.`,
  },
  {
    q: 'Does the free plan put a watermark on clips?',
    a: `Yes. Clips made on the Cloud free plan carry an OpenShorts watermark and are kept for 7 days. Every paid plan from ${money(STARTER.monthly)}/month removes it, and upgrading also removes it from the clips you already made on the free plan, without re-rendering them. The self-hosted edition never watermarks anything.`,
  },
  {
    q: 'What does one minute pay for?',
    a: 'One minute of the source video you import, rounded down to whole minutes with a minimum of 1. A 45-minute podcast uses 45 minutes whether it yields 3 clips or 15. Trimming, recutting, reframing, captions and the hook overlay on clips you already have are free; titles and descriptions are free too.',
  },
  {
    q: 'Can I get a refund?',
    a: 'If you were charged in the last 14 days and have not used the service since, we refund that most recent charge in full; email info@openshorts.app from the account address. EU consumers also have the statutory 14-day withdrawal right, which refunds the unused part if you did spend minutes. The full rules are on the refund policy page.',
  },
  {
    q: 'Can I cancel or pause my plan?',
    a: 'You can cancel any time from your account page; the plan stays active until the end of the period you paid for. On a monthly plan the cancel flow can also offer to put the subscription on hold for a month instead, once per subscription.',
  },
  {
    q: 'Can I switch between Starter, Creator and Pro?',
    a: 'One subscription runs per account, and you manage it from your account page (Manage billing opens the Stripe customer portal). Moving from free to any paid plan removes the watermark from your existing clips. Unused plan minutes do not roll over to the next period.',
  },
  {
    q: 'Do yearly plans cost less?',
    a: `Yes, yearly billing is two months free: Starter ${money(STARTER.yearlyTotal)}/year, Creator ${money(CREATOR.yearlyTotal)}/year and Pro ${money(PRO.yearlyTotal)}/year, against ${money(STARTER.monthly)}, ${money(CREATOR.monthly)} and ${money(PRO.monthly)} a month. The monthly minute allowance is the same on both.`,
  },
  {
    q: 'Is the API or MCP server an extra cost?',
    a: 'No. API and MCP calls draw from the same minute balance as the dashboard on every Cloud plan, with no per-call charge. The self-hosted edition serves the same endpoints with no metering at all.',
  },
  {
    q: 'Should I self-host instead of paying for Cloud?',
    a: `Self-host if you have a machine with Docker and 8 GB+ of RAM, want the video to stay on it, and do not mind slower processing on CPU (an 8-minute video takes 5 to 8 minutes) or managing your own Gemini key. Pay for Cloud if you want a GPU (about 50 seconds for the same video), the keys included, auto-posting wired up and an always-on MCP endpoint, from ${money(STARTER.monthly)}/month.`,
  },
]

const pricingTable = () => {
  const row = (cells) => `<tr>${cells.map((c, i) => (i === 0 ? `<td class="os">${c}</td>` : `<td>${c}</td>`)).join('')}</tr>`
  return `<table>
<thead><tr><th>Plan</th><th>Monthly</th><th>Yearly</th><th>Minutes a month</th><th>Watermark</th><th>Start</th></tr></thead>
<tbody>
${row([
  '<strong>Free</strong> (Cloud)',
  '$0',
  '$0',
  `First video whole up to ${FIRST_VIDEO_MINUTES} min, then ${FREE.monthly.minutes} min`,
  'Yes, clips kept 7 days',
  btn('/#app', 'Start free', 'free', true),
])}
${PAID.map((p) =>
  row([
    `<strong>${esc(p.name)}</strong><br><small>${esc(p.blurb)}</small>`,
    `${money(p.monthly)}/month`,
    `${money(p.yearlyTotal)}/year (${money(p.yearlyPerMonth)}/month)`,
    `${p.minutes} min`,
    'No',
    `${btn(checkoutHref(p.id), `Get ${p.name}`, p.id)}<br><a href="${esc(checkoutHref(p.id, true))}"${track(`${p.id}_year`)}>or yearly</a>`,
  ])
).join('\n')}
${row([
  '<strong>Self-hosted</strong> (MIT)',
  '$0',
  '$0',
  'No cap: your own hardware',
  'Never',
  `<a href="/self-hosted-ai-clip-maker">How to self-host</a>`,
])}
</tbody>
</table>`
}

const pricing = () => ({
  path: '/pricing',
  title: `OpenShorts Pricing: Free, ${money(STARTER.monthly)}, ${money(CREATOR.monthly)}, ${money(PRO.monthly)} Plans`,
  description: `OpenShorts Cloud: a free plan with ${FREE.monthly.minutes} min/month (watermarked), then Starter ${money(STARTER.monthly)}, Creator ${money(CREATOR.monthly)} and Pro ${money(PRO.monthly)} a month without watermark. Self-hosted: $0 under MIT.`,
  h1: 'OpenShorts pricing: a free plan, three paid plans, and $0 self-hosted',
  breadcrumb: [{ name: 'Pricing' }],
  published: PUBLISHED,
  updated: PUBLISHED,
  cta: {
    label: 'Start free',
    title: 'Try it on one of your videos first',
    body: `Your first video is clipped whole up to ${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} free minutes a month. Google sign-in, no credit card.`,
    button: 'Start free',
    href: '/#app',
  },
  tldr: [
    `OpenShorts Cloud has four plans: <strong>Free</strong> ($0, your first video up to ${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} minutes a month, watermarked), <strong>Starter</strong> at ${money(STARTER.monthly)}/month for ${STARTER.minutes} minutes, <strong>Creator</strong> at ${money(CREATOR.monthly)}/month for ${CREATOR.minutes} minutes and <strong>Pro</strong> at ${money(PRO.monthly)}/month for ${PRO.minutes} minutes. Paid plans have no watermark.`,
    'A minute is one minute of the source video you import, not one clip you export. Editing the clips you already have (trims, recuts, captions, hooks) costs nothing.',
    'OpenShorts self-hosted is the same software, free and open source under MIT: run it with Docker on your own machine, bring your own API keys, no watermark and no cap.',
  ],
  facts: [
    { k: 'Free', v: '$0', s: `${FREE.monthly.minutes} min/month after the first video, watermarked` },
    { k: STARTER.name, v: `${money(STARTER.monthly)}/mo`, s: `${STARTER.minutes} min, no watermark` },
    { k: CREATOR.name, v: `${money(CREATOR.monthly)}/mo`, s: `${CREATOR.minutes} min, no watermark` },
    { k: PRO.name, v: `${money(PRO.monthly)}/mo`, s: `${PRO.minutes} min, priority queue` },
  ],
  body: `
<h2>How much does OpenShorts cost?</h2>
<p class="checked">Prices in US dollars, taxes shown at checkout. Checked ${esc(OS.checked)}.</p>
${pricingTable()}
<p>Every button above opens the real Stripe checkout for that plan. If you are not
signed in yet, it asks you to sign in with Google first and then carries on to
the same checkout, so the plan you picked is not lost on the way.</p>
<p>The price per minute falls as the plan grows: about ${STARTER.perMinuteCents}¢ a
minute on ${STARTER.name}, ${CREATOR.perMinuteCents}¢ on ${CREATOR.name} and
${PRO.perMinuteCents}¢ on ${PRO.name}, billed monthly. On yearly billing each plan
costs ten months instead of twelve.</p>

<h2>What does a minute mean?</h2>
<p>OpenShorts meters one thing: the length of the video you send it. A minute on
your plan is one minute of source video, rounded down to whole minutes with a
minimum of one, so a 4 minute 40 second video costs 4 minutes and a 30-second
video costs 1. It does not matter how many clips come out. A 45-minute podcast
uses 45 minutes whether the AI finds 3 moments worth posting or 15.</p>
<p>Before a job runs, the dashboard shows what it will cost. If you only want part
of a long video, "Clip only part of it" lets you pick a from/to range and only
that stretch is billed. A 3-hour livestream where the interesting bit is the last
40 minutes costs 40 minutes, not 180.</p>
<p>What does not use minutes:</p>
<ul>
<li>Editing clips you already have: trimming, recutting, reframing, re-rendering, captions and the hook overlay.</li>
<li>Titles and descriptions for YouTube.</li>
<li>Up to 5 AI edits or AI effects a day. Past that, each one sends the clip to Gemini again and costs like a short analysis.</li>
</ul>
<p>AI thumbnail image generation is the one extra: each batch uses about 3 minutes
of your balance. API and MCP calls are not a separate meter; an agent that clips
a video spends the same minutes the dashboard would.</p>

<h2>What does the free plan include?</h2>
<p>The free plan exists so you can judge the output on your own footage before
paying. Your first video is clipped whole up to ${FIRST_VIDEO_MINUTES} minutes long,
so a full podcast episode or webinar works on day one. After that you get
${FREE.monthly.minutes} minutes a month, reset monthly. A video longer than your
remaining balance is not refused: the free plan clips its first part, up to the
minutes you have left, and tells you which part the clips came from.</p>
<ul>
<li>YouTube links or uploads, the same GPU rendering as the paid plans, and the Gemini key included.</li>
<li>No credit card: you sign in with Google.</li>
<li>Clips carry an OpenShorts watermark and are kept for 7 days.</li>
</ul>
<p>The watermark is honest about what it is: the reason to upgrade. It is burned
only into the copy you are served, never into the clip itself, so upgrading
removes it from the clips you already made without re-processing anything.</p>

<h2>What does every paid plan add?</h2>
<ul>
<li><strong>No watermark</strong> and no 7-day expiry: clips stay in your library.</li>
<li><strong>GPU rendering</strong>: an 8-minute video is clipped in about 50 seconds, against 5 to 8 minutes on a typical CPU.</li>
<li><strong>The Gemini key is included</strong>, so there is nothing to sign up for or paste.</li>
<li><strong>Auto-posting</strong> to TikTok, Instagram Reels and YouTube Shorts, already wired up.</li>
<li><strong>MCP server and API access</strong> for Claude, ChatGPT, n8n or your own scripts, on the same minutes. See <a href="/mcp">the MCP guide</a> and <a href="/automate-shorts-api">the API guide</a>.</li>
<li><strong>YouTube Studio</strong>: titles, thumbnails and descriptions.</li>
<li>On <strong>${PRO.name}</strong>, the priority processing queue.</li>
</ul>
<p>Need more than a plan's allowance in one month? One-time top-ups add minutes
from your account page without changing plan; on ${PRO.name}, 200 extra minutes
cost ${money(TOPUP_PRICE)}.</p>

<h3>What still needs your own key</h3>
<p>Two features use premium generation that no plan covers yet: AI Shorts (UGC
videos with AI actors, through fal.ai) and voice dubbing into 30+ languages
(through ElevenLabs). You connect your own keys for those and the providers bill
you directly. Your plan still covers the script and the orchestration.</p>

<h2>Monthly or yearly, cancelling and pausing</h2>
<p>Every paid plan is sold monthly or yearly. Yearly is two months free:
${STARTER.name} ${money(STARTER.yearlyTotal)}/year, ${CREATOR.name}
${money(CREATOR.yearlyTotal)}/year and ${PRO.name} ${money(PRO.yearlyTotal)}/year.
Your monthly minutes are the same either way.</p>
<p>Subscriptions renew automatically until you cancel. You cancel from your
account page (a reason, an optional rating, then confirm) and it takes effect at the end of the period you
paid for, which you keep using in full. If the reason is that you are not using
it this month, a monthly plan can be put on hold for a month instead of
cancelled (once per subscription): no charge while it is on hold, the free plan's
minutes in the meantime, your library kept, and billing
resumes on its own afterwards. Unused plan
minutes do not roll over to the next period.</p>

<h2>Refunds</h2>
<p>If you were charged in the last 14 days and have not used the service since,
we refund that most recent charge in full, no reason needed. It is built for the
renewal you did not notice. If you did spend minutes, EU consumers can still use
the 14-day withdrawal right, which refunds the part you did not use. Both are
one email to info@openshorts.app from your account address; the details are in
the <a href="/refunds">refund policy</a>.</p>

<h2>Self-hosted or Cloud: which one is cheaper for you?</h2>
<p>Both run the same pipeline. The difference is who provides the machine and
the keys.</p>
<table>
<thead><tr><th></th><th>Self-hosted</th><th>Cloud</th></tr></thead>
<tbody>
<tr><td>Price</td><td class="os">$0, MIT licence</td><td class="os">Free plan, then ${money(STARTER.monthly)} to ${money(PRO.monthly)}/month</td></tr>
<tr><td>Speed, 8-min video</td><td>5 to 8 min on CPU; about a minute with an NVIDIA GPU</td><td>About 50 seconds on our GPU</td></tr>
<tr><td>API keys</td><td>Bring your own Gemini (or a local LLM)</td><td>Gemini included</td></tr>
<tr><td>Watermark and cap</td><td>None</td><td>Watermark and ${FREE.monthly.minutes} min/month on free; neither on paid</td></tr>
<tr><td>Where the video goes</td><td>Stays on your machine</td><td>Our servers</td></tr>
<tr><td>MCP endpoint</td><td>Only while your machine is on</td><td>Always on</td></tr>
</tbody>
</table>
<p>If you process a lot of long recordings and already have a capable machine,
self-hosting wins on cost by a wide margin. The setup, requirements and real
running costs are on <a href="/self-hosted-ai-clip-maker">the self-hosting guide</a>.</p>

<h2>How OpenShorts compares on price</h2>
<p>Most clipping tools meter the minutes you import, like we do, so they can be
priced on one axis. Move the slider to your own monthly volume; each bar is the
cheapest published plan that covers it.</p>
${costCalculator(['opus-clip', 'vizard', 'vidyo-ai', '2short'], { minutes: 300 })}
<p>Tools that bill per clip or per video (Klap, Submagic, SendShort) cannot be
placed on this axis honestly. Their plans, and every free tier side by side, are
in <a href="/free-ai-clipping-tools-compared">the free plans comparison</a> and
<a href="/alternatives">the alternatives hub</a>.</p>

${faqBlock(PRICING_FAQ)}

${sources([
  'OpenShorts plan prices and minutes from the project\'s pricing data, the same figures the in-app checkout uses.',
  'Cancellation, renewal and withdrawal terms: <a href="/terms">Terms of Service</a>, sections 11 and 12. Refunds: <a href="/refunds">Refund Policy</a>.',
  `Competitor prices in the calculator checked ${esc(PRICE_MODELS['opus-clip'].checked)} on each vendor's public pricing page.`,
])}
`,
  faq: PRICING_FAQ,
  extraNodes: [
    {
      '@type': 'Product',
      '@id': `${SITE.url}/pricing#product`,
      name: 'OpenShorts Cloud',
      description: EDITIONS.cloud.summary,
      image: SITE.ogImage,
      brand: { '@id': `${SITE.url}/#organization` },
      url: `${SITE.url}/pricing`,
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          url: `${SITE.url}/pricing`,
          description: `First video up to ${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} minutes a month, watermarked, no credit card.`,
        },
        ...PAID.flatMap((p) => [
          {
            '@type': 'Offer',
            name: `${p.name} (monthly)`,
            price: String(p.monthly),
            priceCurrency: 'USD',
            url: `${SITE.url}/pricing`,
            description: `${p.minutes} minutes of source video a month, no watermark.`,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: p.monthly,
              priceCurrency: 'USD',
              unitCode: 'MON',
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
            },
          },
          {
            '@type': 'Offer',
            name: `${p.name} (yearly)`,
            price: String(p.yearlyTotal),
            priceCurrency: 'USD',
            url: `${SITE.url}/pricing`,
            description: `${p.minutes} minutes of source video a month, billed yearly, no watermark.`,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: p.yearlyTotal,
              priceCurrency: 'USD',
              unitCode: 'ANN',
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'ANN' },
            },
          },
        ]),
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE.url}/pricing#selfhosted`,
      name: EDITIONS.selfHosted.name,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Linux, macOS, Windows (Docker)',
      description: EDITIONS.selfHosted.summary,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
  related: ['/self-hosted-ai-clip-maker', '/free-ai-clipping-tools-compared', '/opus-clip-pricing'],
})

/* ---------------------------------------------------- /self-hosted-ai-clip-maker */

const SELF_FAQ = [
  {
    q: 'Is there an open source version of Opus Clip?',
    a: 'Opus Clip itself is closed source and cloud only. OpenShorts is the open source alternative: MIT-licensed, self-hosted with Docker, and covering the same job of finding the best moments in a long video, reframing them to 9:16 with face tracking and burning in word-level subtitles.',
  },
  {
    q: 'What hardware do I need to self-host OpenShorts?',
    a: 'Docker and Docker Compose, 8 GB of RAM or more and a modern multi-core CPU. On CPU an 8-minute video takes 5 to 8 minutes. An NVIDIA GPU with NVENC is optional and brings that to about a minute; 8 GB of VRAM is enough for the large-v3-turbo transcription model in fp16 plus the detection models.',
  },
  {
    q: 'Does self-hosted OpenShorts have a watermark or a usage limit?',
    a: 'No. The self-hosted edition has no watermark code and no metering code. The only limits are your hardware and the quotas of the API keys you bring.',
  },
  {
    q: 'Which API keys do I need?',
    a: 'Only a Google Gemini key for the AI features, and its free tier covers individual use. You can replace it with a local LLM through LLM_BASE_URL. ElevenLabs (dubbing), fal.ai (AI Shorts) and Upload-Post (auto-posting) are optional and only needed for those features.',
  },
  {
    q: 'Does my video leave my machine?',
    a: 'The video file stays local: transcription, scene detection, reframing and encoding run on your machine. With Gemini, the moment picker receives the transcript text, the automatic layout picker receives a few still frames, and videos with no speech are sent to Gemini to be clipped by what is on screen. With a local LLM and no Gemini key, nothing leaves the machine at all.',
  },
  {
    q: 'Is there an open source AI clipping API?',
    a: 'Yes. A self-hosted OpenShorts serves the same REST API and MCP endpoint as the hosted service, with no metering: POST a video, get a signed webhook with the clips. It runs only while your machine is on; the hosted endpoint is always on and draws from your plan minutes.',
  },
  {
    q: 'Can I use self-hosted OpenShorts commercially?',
    a: 'Yes. The core application is MIT-licensed, which allows commercial use, modification and redistribution. The cloud/ directory (billing and hosted-service code) is under a separate licence and is not needed to self-host.',
  },
  {
    q: 'How much does self-hosting really cost compared to Opus Clip or Vizard?',
    a: `The software is $0. What you pay is the machine, its electricity and your time, plus Gemini usage, which is typically under a cent per 10-minute video on paid tiers and free within the free tier. Opus Clip and Vizard bill one credit per source minute: at 300 minutes a month that is ${money(priceFor('opus-clip', 300, 'monthly').price)}/month on Opus Clip and ${money(priceFor('vizard', 300, 'monthly').price)}/month on Vizard, billed monthly.`,
  },
]

const selfHosted = () => {
  const podcast = 260 // a weekly 60-minute show, ~4.3 episodes a month
  const opus = priceFor('opus-clip', podcast, 'monthly')
  const vizard = priceFor('vizard', podcast, 'monthly')
  const cloud = priceFor('openshorts', podcast, 'monthly')
  const heavy = 1200
  const opusHeavy = priceFor('opus-clip', heavy, 'monthly')
  const quso = priceFor('vidyo-ai', heavy, 'yearly')
  return {
    path: '/self-hosted-ai-clip-maker',
    title: 'Self-Hosted AI Clip Maker (Docker, MIT) | OpenShorts',
    description:
      'Self-host OpenShorts, the open source Opus Clip alternative: requirements, Docker quick start, your own keys, privacy, and the real cost vs per-minute credits.',
    h1: 'A self-hosted AI clip maker: requirements, setup and what it really costs',
    breadcrumb: [
      { name: 'Open source video clipper', path: '/open-source-video-clipper' },
      { name: 'Self-hosting guide' },
    ],
    published: PUBLISHED,
    updated: PUBLISHED,
    cta: {
      label: 'Self-host or try it hosted',
      title: 'Clone it, or test the output first',
      body: `The repo is MIT and free to run. If you want to see the clips before installing anything, the hosted free plan clips your first video up to ${FIRST_VIDEO_MINUTES} minutes; paid plans from ${money(STARTER.monthly)}/month.`,
      button: 'Source on GitHub',
      href: SITE.repo,
    },
    tldr: [
      'OpenShorts is an open source AI clip maker you can self-host: MIT-licensed, started with one <code>docker compose up</code>, and running the same pipeline as the hosted service. It finds the strongest moments in a long video, reframes them to 9:16 with face tracking and burns in word-level subtitles.',
      'You need Docker, 8 GB+ of RAM and a Google Gemini key (free tier, or a local LLM instead). An optional NVIDIA GPU cuts an 8-minute video from 5 to 8 minutes of processing to about one.',
      `Self-hosted has no watermark, no cap and no per-minute meter. The hosted edition, OpenShorts Cloud, exists for people who would rather not run it: free plan with a watermark, paid from ${money(STARTER.monthly)}/month.`,
    ],
    facts: [
      { k: 'Licence', v: 'MIT', s: 'Commercial use allowed' },
      { k: 'Software cost', v: '$0', s: 'No watermark, no cap' },
      { k: '8-min video', v: '5-8 min', s: 'On CPU; about 1 min with an NVIDIA GPU' },
      { k: 'Your video', v: 'Local', s: 'Transcribed and rendered on your machine' },
    ],
    body: `
<p>This page is the practical half of self-hosting: what you need, the commands,
what it costs to run and what you give up. For the licence and the case for
open source clipping in general, see <a href="/open-source-video-clipper">the open
source video clipper</a>; if you are not sure a clipper is what you want rather
than a text-to-video model, start with <a href="/open-source-ai-video-generator">the
open source AI video generator</a> page.</p>

<h2>What do you get when you self-host?</h2>
<p>The same software as the hosted service, not a cut-down community edition.
The pipeline is identical, stage by stage:</p>
<ol>${PIPELINE_STEPS.map((s) => `<li><strong>${esc(s.title)}.</strong> ${esc(s.body.split('. ')[0])}.</li>`).join('')}</ol>
<p>On top of the clip generator you get the layouts that make podcasts and screen
recordings work in 9:16 (two speakers stacked, a screen above the presenter, a
webcam inset enlarged), the hook overlay, the clip editor, the YouTube Studio for
titles, thumbnails and descriptions, AI Shorts with your fal.ai key, dubbing with
your ElevenLabs key, and the REST API and MCP server for agents. The stage-by-stage
detail is in <a href="/how-openshorts-works">how OpenShorts works</a>.</p>

<h2>What are the requirements?</h2>
<ul>
<li><strong>Docker and Docker Compose.</strong> Linux, macOS, or Windows with Docker Desktop on the WSL2 backend.</li>
<li><strong>8 GB of RAM or more</strong> and a modern multi-core CPU. The first start downloads the transcription and detection models.</li>
<li><strong>A Google Gemini API key</strong> for the AI features. The free tier is enough for individual use, or you can point the moment picker at a local LLM instead.</li>
<li><strong>Optional: an NVIDIA GPU with NVENC</strong> (an RTX 4060 class card is plenty). 8 GB of VRAM fits the large-v3-turbo transcription model in fp16 plus the detection models. The GPU build adds about 2 GB to the image.</li>
</ul>
<p>The default image is CPU-only, and that is a perfectly good way to start. On a
typical CPU an 8-minute video takes 5 to 8 minutes; with the GPU build it takes
about a minute. If you clip a weekly podcast overnight, CPU is fine. If you clip
every day and want results while you wait, the GPU is worth it.</p>

<h2>Quick start</h2>
<pre><code>git clone https://github.com/mutonby/openshorts.git
cd openshorts
cp .env.example .env        # optional: S3 backup and other settings
docker compose up --build</code></pre>
<p>Open <code>http://localhost:5175</code>, go to <strong>Settings</strong> and
paste your Gemini key (plus fal.ai, ElevenLabs and Upload-Post keys if you want
those features). Then paste a YouTube link or upload a file in the Clip Generator.
The backend API listens on port 8000.</p>

<h3>Turning on the GPU</h3>
<p>Install the NVIDIA driver and the NVIDIA Container Toolkit on the host
(<code>nvidia-smi</code> must work), then create a
<code>docker-compose.override.yml</code> next to the compose file:</p>
<pre><code>services:
  backend:
    build:
      context: .
      args:
        GPU: "1"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu, video]</code></pre>
<p>and set these in <code>.env</code>:</p>
<pre><code>WHISPER_MODEL=large-v3-turbo
WHISPER_DEVICE=cuda
WHISPER_COMPUTE=float16
FFMPEG_ENCODER=auto</code></pre>
<p><code>FFMPEG_ENCODER=auto</code> probes the NVENC encoder at startup and falls
back to x264 if it is missing, and a CUDA error during transcription retries once
on CPU, so a misconfigured GPU degrades to slow rather than broken. The README
has the verification commands.</p>

<h2>Bring your own keys: what each one is for</h2>
<table>
<thead><tr><th>Key</th><th>Needed for</th><th>Cost</th></tr></thead>
<tbody>
<tr><td class="os">Google Gemini</td><td>Picking the moments, titles, the layout picker</td><td>Free tier for individual use; under a cent per 10-minute video on paid tiers</td></tr>
<tr><td class="os">Local LLM (optional)</td><td>Replaces Gemini for moment picking: Ollama, LM Studio, vLLM, llama.cpp</td><td>$0, your hardware</td></tr>
<tr><td class="os">ElevenLabs (optional)</td><td>Dubbing into 30+ languages, voice-over</td><td>Billed by ElevenLabs; free tier available</td></tr>
<tr><td class="os">fal.ai (optional)</td><td>AI Shorts: AI actors, lip-sync, B-roll</td><td>Pay per video, billed by fal.ai</td></tr>
<tr><td class="os">Upload-Post (optional)</td><td>Posting to TikTok, Instagram and YouTube</td><td>Free tier available</td></tr>
</tbody>
</table>
<p>To run without any Google key, set <code>LLM_BASE_URL</code> and
<code>LLM_MODEL</code> in <code>.env</code> to any OpenAI-compatible server. Give
it a context of 16k tokens (Ollama defaults to 4k and truncates silently) and a
7-8B model or larger; 3B models do not return valid JSON reliably. Without
Gemini, the features that need to look at frames fall back: the automatic layout
picker uses the plain face-tracking crop, and a video with no speech cannot be
clipped.</p>

<h2>Privacy: what leaves your machine</h2>
<p>The video file stays where it is. Downloading, transcription, scene detection,
face tracking, reframing and encoding all run locally, and the clips are written
to your disk. What goes out depends on the keys you configure:</p>
<ul>
<li><strong>With Gemini:</strong> the moment picker sends the transcript text, never the video. The automatic layout picker sends a handful of still frames. A video with no speech (gameplay, B-roll) is sent to Gemini so it can be clipped by what is on screen.</li>
<li><strong>With a local LLM and no Gemini key:</strong> nothing leaves the machine.</li>
<li><strong>Optional features</strong> call their providers only when you use them: dubbing sends audio to ElevenLabs, AI Shorts sends prompts to fal.ai, posting sends the finished clip to Upload-Post.</li>
</ul>
<p>That is the real reason teams self-host a clipper: unreleased episodes, client
work and internal recordings never touch a third-party upload form, and there is
no retention policy to read because there is no retention.</p>

<h2>What does it cost compared to per-minute credits?</h2>
<p>Opus Clip and Vizard bill one credit per minute of video you import; Quso
bills roughly one credit per minute. That meter is what makes long-form clipping
expensive. A weekly 60-minute podcast is about ${podcast} minutes a month. On
monthly billing that is ${opus ? `${money(opus.price)}/month on Opus Clip (${esc(opus.plan)})` : 'past every published Opus Clip plan'},
${vizard ? `${money(vizard.price)}/month on Vizard (${esc(vizard.plan)})` : 'past every published Vizard plan'}
and ${money(cloud.price)}/month on OpenShorts Cloud (${esc(cloud.plan)}). Self-hosted,
it is $0 in software. At ${heavy} minutes a month (a daily 40-minute stream),
${opusHeavy ? `Opus Clip costs ${money(opusHeavy.price)}/month` : 'Opus Clip has no published plan and moves you to custom Business pricing'}${quso ? `, and Quso costs ${money(quso.price)}/month on its yearly plan` : ''}.</p>
${costCalculator(['opus-clip', 'vizard', 'vidyo-ai'], { minutes: 600 })}
<p>The self-hosted bar is not literally free. What you actually pay:</p>
<ul>
<li><strong>The machine.</strong> If you already own a desktop with 8 GB+ of RAM, nothing extra. A GPU is a one-off purchase that pays for itself only at high volume.</li>
<li><strong>Electricity</strong> for the minutes it spends processing.</li>
<li><strong>API usage.</strong> Gemini is free within its free tier and under a cent per 10-minute video beyond it. Dubbing and AI Shorts are billed by ElevenLabs and fal.ai if you use them.</li>
<li><strong>Your time</strong> to install it, update it (<code>git pull</code> and rebuild) and keep the machine on.</li>
</ul>
<p>Rule of thumb: below a couple of hours of source a month, a hosted plan is
cheaper than your time. Above that, and especially for long recordings, the
per-minute meter is the whole bill, and self-hosting removes it.</p>

<h2>Using it from agents: API and MCP</h2>
<p>A self-hosted instance serves the same REST API and MCP server as the hosted
one, unmetered. An agent in Claude, ChatGPT or n8n can submit a video, wait for
the signed webhook and publish the clips, with no per-call price. There is also
a stdio MCP transport for local clients. The catch is availability: the endpoint
is up only while your machine is. Setup and the tool list are on
<a href="/mcp">the MCP page</a>; the one-POST, one-webhook flow is on
<a href="/automate-shorts-api">automate shorts with the API</a>.</p>

<h2>What you give up compared to Cloud</h2>
<ul>
<li><strong>Speed without a GPU.</strong> Cloud renders on an NVIDIA GPU, about 50 seconds per 8-minute video. A CPU-only box takes 5 to 8 minutes.</li>
<li><strong>Zero setup.</strong> Cloud has the Gemini key included and auto-posting already connected. Self-hosted, you create and manage the keys.</li>
<li><strong>An always-on endpoint.</strong> Cloud's MCP server and webhooks work while your laptop sleeps.</li>
<li><strong>Storage and backup.</strong> Cloud keeps your clips and serves them from any browser. Self-hosted, they live on your disk unless you configure S3 backup.</li>
<li><strong>Maintenance.</strong> Updates, YouTube download changes and model downloads are yours to handle.</li>
</ul>
<p>Nothing is feature-locked: the hosted plans pay for hardware and keys, not
for features. If those trade-offs are not worth it to you, the
<a href="/pricing">Cloud plans</a> start with a free tier and go from
${money(STARTER.monthly)} to ${money(PRO.monthly)} a month.</p>

<h2>Self-hosted or Cloud: a quick decision</h2>
<ul>
<li><strong>Self-host</strong> if the footage is private, your volume is high or your sources are long, you are comfortable with Docker, or you want to change how the pipeline cuts and reframes.</li>
<li><strong>Use Cloud</strong> if you want results in under a minute on any laptop, you do not want to manage keys, or you need an endpoint that is always on for an agent.</li>
<li><strong>Do both:</strong> test the output on the hosted free plan, then self-host once you know it fits your footage. It is the same pipeline, so the clips match.</li>
</ul>

${faqBlock(SELF_FAQ)}

${sources([
  `Requirements, commands and environment variables from the project README at <a href="${SITE.repo}" rel="noopener">github.com/mutonby/openshorts</a>.`,
  `Competitor plans in the calculator checked ${esc(PRICE_MODELS['opus-clip'].checked)} on each vendor's public pricing page; the full plan breakdowns are in <a href="/alternatives">the alternatives hub</a>.`,
])}
`,
    faq: SELF_FAQ,
    extraNodes: [
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${SITE.url}/self-hosted-ai-clip-maker#code`,
        name: 'OpenShorts',
        description:
          'Open source AI clip maker: turns long videos into vertical 9:16 clips with AI moment detection, face-tracked reframing and word-level subtitles. Self-hosted with Docker.',
        codeRepository: SITE.repo,
        license: 'https://opensource.org/licenses/MIT',
        programmingLanguage: ['Python', 'JavaScript'],
        runtimePlatform: 'Docker',
        author: { '@id': `${SITE.url}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE.url}/self-hosted-ai-clip-maker#app`,
        name: EDITIONS.selfHosted.name,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Linux, macOS, Windows (Docker)',
        description: EDITIONS.selfHosted.summary,
        license: 'https://opensource.org/licenses/MIT',
        downloadUrl: SITE.repo,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ],
    related: ['/open-source-video-clipper', '/pricing', '/mcp'],
  }
}

/* ------------------------------------------------ /free-ai-clipping-tools-compared */

/* One row per tool. `must` lists the phrases the row relies on; each has to
 * appear in that vendor's free-tier text in data.js (tiers[0] plus tierNote),
 * or the build fails. "Not stated" means the vendor's pricing page did not say
 * on the checked date, not that the answer is no. */
const FREE_ROWS = [
  {
    slug: '2short',
    ongoing: true,
    allowance: '30 min of analysis a month',
    resolution: '1080p',
    watermark: 'No',
    card: 'Not stated',
    limits: 'YouTube links only',
    must: ['30 minutes', 'no watermark', '1080p', 'YouTube links only'],
  },
  {
    slug: 'opus-clip',
    ongoing: true,
    allowance: '60 min of source a month',
    resolution: '1080p',
    watermark: 'Yes',
    card: 'Not stated (the 7-day Pro trial needs none)',
    limits: 'No editing; export within 3 days',
    must: ['60 credits', '1080p', 'watermark', 'no editing', '3 days', 'no credit card'],
  },
  {
    slug: 'vizard',
    ongoing: true,
    allowance: '60 min of uploads a month',
    resolution: '720p',
    watermark: 'Yes',
    card: 'Not stated',
    limits: 'Uploads up to 60 min, exports up to 10 min, 3-day storage',
    must: ['60 credits', '720p', 'watermark', 'up to 60 minutes', 'up to 10 minutes', '3-day storage'],
  },
  {
    slug: 'vidyo-ai',
    ongoing: true,
    allowance: '75 min a month (about 1 credit per min)',
    resolution: '720p',
    watermark: 'Not stated',
    card: 'Not stated',
    limits: 'Data kept 7 days, no scheduling',
    must: ['75 credits', '720p', '7 days', 'no scheduling'],
  },
  {
    slug: 'klap',
    ongoing: false,
    allowance: 'One video, once',
    resolution: 'Not stated',
    watermark: 'Not stated',
    card: 'No',
    limits: 'No ongoing free plan',
    must: ['one video', 'no credit card', 'no ongoing free plan'],
  },
  {
    slug: 'submagic',
    ongoing: false,
    allowance: 'None; a trial instead',
    resolution: 'n/a',
    watermark: 'n/a',
    card: 'No (for the trial)',
    limits: 'No free plan',
    must: ['no free plan', 'no credit card'],
  },
  {
    slug: 'sendshort',
    ongoing: false,
    allowance: 'None; 3 free videos at sign-up',
    resolution: 'n/a',
    watermark: 'n/a',
    card: 'Not stated',
    limits: 'No free plan; long-video clipping from the $29 plan',
    must: ['no free plan', '3 free videos'],
  },
]

for (const r of FREE_ROWS) {
  const c = COMPETITORS[r.slug]
  if (!c) throw new Error(`[guide-pages] no competitor "${r.slug}" in data.js`)
  const text = `${c.tiers[0][1]} ${c.tierNote || ''} ${c.tiers[0][0]}`
  for (const m of r.must) assertIn(text, m, `${r.slug} free tier`)
}
assertIn(COMPETITORS.sendshort.gotcha, '$29', 'sendshort clipping price')

const freeCompared = () => {
  const vendorRows = FREE_ROWS.map((r) => ({ ...r, name: COMPETITORS[r.slug].name, paid: COMPETITORS[r.slug].entryPrice, checked: COMPETITORS[r.slug].checked, link: `/alternatives/${r.slug}` }))
  const osCloud = {
    name: 'OpenShorts Cloud',
    ongoing: true,
    allowance: `First video whole up to ${FIRST_VIDEO_MINUTES} min, then ${FREE.monthly.minutes} min a month`,
    resolution: 'Same as paid plans',
    watermark: 'Yes',
    card: 'No (Google sign-in)',
    limits: 'Clips kept 7 days',
    paid: `${money(STARTER.monthly)}/month`,
    checked: OS.checked,
    link: '/pricing',
    us: true,
  }
  const osSelf = {
    name: 'OpenShorts self-hosted',
    ongoing: true,
    allowance: 'No cap (your hardware)',
    resolution: 'Same as your source',
    watermark: 'No',
    card: 'No (no account at all)',
    limits: 'Needs Docker and your own Gemini key or a local LLM',
    paid: 'Free, MIT',
    checked: OS.checked,
    link: '/self-hosted-ai-clip-maker',
    us: true,
  }
  const all = [osSelf, ...vendorRows.filter((r) => r.ongoing), osCloud, ...vendorRows.filter((r) => !r.ongoing)]
  const latest = all.map((r) => r.checked).sort().at(-1)
  const asOf = monthName(latest)
  const listNames = (rows) =>
    rows.map((r) => r.name).reduce((s, n, i, a) => (i === 0 ? n : i === a.length - 1 ? `${s} and ${n}` : `${s}, ${n}`), '')
  const noMark = all.filter((r) => r.ongoing && r.watermark === 'No')
  const marked = all.filter((r) => r.ongoing && r.watermark === 'Yes')
  const unknown = all.filter((r) => r.ongoing && r.watermark === 'Not stated')
  const noFree = all.filter((r) => !r.ongoing)
  const answer = `As of ${asOf}, the free plans in this comparison that export without a watermark are ${listNames(noMark)}. ${listNames(marked)} watermark their free exports${unknown.length ? `; ${listNames(unknown)} does not say on its pricing page` : ''}. ${listNames(noFree)} have no ongoing free plan.`

  const cell = (v) => {
    const cls = v === 'No' ? ' class="yes"' : ''
    return `<td${cls}>${esc(v)}</td>`
  }
  const table = `<table>
<thead><tr><th>Tool</th><th>Free allowance</th><th>Max resolution</th><th>Watermark</th><th>Card needed</th><th>Limits</th><th>Paid from</th><th>Checked</th></tr></thead>
<tbody>${all
    .map(
      (r) =>
        `<tr><td class="os"><a href="${esc(r.link)}">${esc(r.name)}</a></td><td>${esc(r.allowance)}</td><td>${esc(r.resolution)}</td>${cell(r.watermark)}<td>${esc(r.card)}</td><td>${esc(r.limits)}</td><td>${esc(r.paid)}</td><td>${esc(r.checked)}</td></tr>`
    )
    .join('')}</tbody>
</table>`

  const minutesFree = vendorRows.filter((r) => r.ongoing).map((r) => ({ name: r.name, min: PRICE_MODELS[r.slug]?.plans.find((p) => p.monthly.price === 0)?.monthly.minutes })).filter((x) => x.min)
  const biggest = minutesFree.sort((a, b) => b.min - a.min)[0]
  biggest.resolution = vendorRows.find((r) => r.name === biggest.name).resolution

  const faq = [
    {
      q: 'Which free AI clip generator has no watermark?',
      a: `${answer} Watermark status is taken from each vendor's pricing page on the checked date.`,
    },
    {
      q: 'What is the best free AI clip generator?',
      a: `It depends on what you need from free. For the most free minutes on a hosted plan, ${biggest.name} gives ${biggest.min} a month at ${biggest.resolution}. For clips you can post without a watermark, 2short.ai's free plan (30 minutes, YouTube links only) or self-hosted OpenShorts (no cap, your own machine). To try a tool on one long video, the OpenShorts Cloud free plan clips the first video whole up to ${FIRST_VIDEO_MINUTES} minutes, watermarked.`,
    },
    {
      q: 'Is the OpenShorts free plan watermarked?',
      a: `Yes. The OpenShorts Cloud free plan watermarks its clips and keeps them 7 days; paid plans from ${money(STARTER.monthly)}/month do not, and upgrading removes the mark from clips already made. The self-hosted edition, free under MIT, has no watermark at all.`,
    },
    {
      q: 'Do free AI clipping tools need a credit card?',
      a: 'Among the plans we checked, OpenShorts Cloud (Google sign-in), Klap\'s one free video and the Opus Clip and Submagic trials state that no card is needed. Most other vendors do not say on their pricing pages either way; self-hosted OpenShorts has no account at all.',
    },
    {
      q: 'Why do free AI clipping tools add a watermark?',
      a: 'Because the GPU time and AI calls behind every clip cost the vendor money, and the watermark is what turns a free user into a paying one. Software you run yourself has no such cost to recover, which is why self-hosted OpenShorts can be free without one.',
    },
  ]

  return {
    path: '/free-ai-clipping-tools-compared',
    title: 'Free AI Clipping Tools Compared: Who Has No Watermark?',
    description: `The free plans of ${vendorRows.length + 1} AI clipping tools side by side, checked ${asOf}: free minutes, resolution, watermark, card required, limits and paid price.`,
    h1: 'Free AI clipping tools compared: minutes, watermark and limits',
    breadcrumb: [{ name: 'Alternatives', path: '/alternatives' }, { name: 'Free plans compared' }],
    published: PUBLISHED,
    updated: PUBLISHED,
    cta: {
      label: 'Free, two ways',
      title: 'Self-host with no watermark, or try it hosted',
      body: `Hosted: first video free up to ${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} minutes a month, watermarked, no card. Self-hosted: MIT, no watermark, no cap.`,
      button: 'Get free clips',
    },
    tldr: [
      answer,
      `The free plans differ more than the headline "free" suggests: from no ongoing plan at all to ${biggest.min} minutes a month, from 720p to 1080p, and from 3 days to 7 days before your clips are gone.`,
    ],
    body: `
<h2>Free AI clip generators, side by side</h2>
<p class="checked">Each vendor's figures checked on the date in its row, on its public pricing page. "Not stated" means the page did not say, not that the answer is no.</p>
${table}
<p>Paid prices are the cheapest entry plan; where a vendor discounts yearly
billing, the price shown is the one it advertises, and the
<a href="/alternatives">alternatives hub</a> has each plan in full.</p>

<h2>How we built this table</h2>
<p>Every figure for a third-party tool comes from that vendor's own public
pricing and help pages, read on the date shown in the "Checked" column. We list
only what the vendor states. When a pricing page is silent on a point (whether
the free plan needs a card, whether Quso's free exports are watermarked), the
cell says "Not stated" instead of guessing. The figures for OpenShorts come from
our own plans. Vendors change free tiers without notice, so check the vendor's
page before you rely on a number, and tell us if one has moved.</p>
<p>"Free allowance" is what you can process each month for $0. Tools meter in
different units: Opus Clip, Vizard and Quso count minutes of video imported,
2short.ai counts minutes analysed, and Klap, Submagic and SendShort count clips
or videos. A one-off trial is not counted as a free plan.</p>

<h2>Which free plan fits which use?</h2>
<ul>
<li><strong>You need clips you can post today, without a watermark:</strong> 2short.ai's free plan if your sources are already on YouTube and 30 minutes a month is enough; self-hosted OpenShorts if you can run Docker and want no cap.</li>
<li><strong>You want the most free minutes on a hosted tool:</strong> ${esc(biggest.name)} (${biggest.min} minutes at ${esc(biggest.resolution)}), then ${minutesFree.slice(1).map((x) => `${esc(x.name)} (${x.min})`).join(', ')}.</li>
<li><strong>You want to judge quality on a full-length episode:</strong> the OpenShorts Cloud free plan clips your first video whole up to ${FIRST_VIDEO_MINUTES} minutes, so a complete podcast or webinar fits.</li>
<li><strong>You want 1080p on free:</strong> Opus Clip (watermarked) or 2short.ai (no watermark). Vizard and Quso cap free exports at 720p.</li>
<li><strong>Your footage is private:</strong> only self-hosting keeps the video on your own machine. Every hosted free plan, ours included, means uploading it.</li>
<li><strong>You only want to try a tool once:</strong> Klap's one free video and the Submagic and SendShort trials work for a single test, not for ongoing use.</li>
</ul>

<h2>Why the watermark column matters</h2>
<p>A watermark on a free export is not a bug or a trick: it is the vendor's way of
covering GPU time and AI calls for people who are not paying. That is also why a
watermark-free hosted free plan is rare, and why the generous ones tend to cap
something else instead: links only, minutes analysed, a short storage window. The
structural exception is software you run yourself, where there is no vendor
cost to recover. The reasoning is laid out on
<a href="/free-ai-clip-generator">the free AI clip generator page</a>.</p>
<p>The OpenShorts Cloud free plan follows the hosted rule and says so: its clips
are watermarked, and paid plans from ${money(STARTER.monthly)}/month are not. The
<a href="/pricing">pricing page</a> has every plan.</p>

<h2>What happens when the free plan runs out?</h2>
<ul>
${vendorRows.filter((r) => r.ongoing).map((r) => `<li><strong>${esc(r.name)}:</strong> paid plans from ${esc(r.paid)}.</li>`).join('\n')}
<li><strong>OpenShorts Cloud:</strong> ${STARTER.name} at ${money(STARTER.monthly)}/month for ${STARTER.minutes} minutes, or self-host for $0.</li>
</ul>
<p>To price your own monthly volume across the tools that meter minutes, use the
calculator on <a href="/pricing">the pricing page</a> or the
<a href="/opus-clip-pricing">Opus Clip pricing breakdown</a>.</p>

${faqBlock(faq)}

${sources([
  ...vendorRows.map((r) => `${esc(r.name)}: free tier and entry price checked ${esc(r.checked)}; details on <a href="${esc(r.link)}">our ${esc(r.name)} comparison</a>.`),
  `OpenShorts: <a href="/pricing">plans</a> and <a href="${SITE.repo}" rel="noopener">source on GitHub</a>.`,
])}
`,
    faq,
    related: ['/free-ai-clip-generator', '/alternatives', '/pricing'],
  }
}

/* -------------------------------------------------- /how-to-clip-a-youtube-video */

const HOWTO_FAQ = [
  {
    q: 'How do you clip a YouTube video?',
    a: 'Note the start and end time of the part you want, then use one of four routes: YouTube Studio\'s editor or Video Clips tool for your own uploads, a free trimmer or ffmpeg on a copy of a video you have the rights to, or an AI clipper such as OpenShorts that finds the best moments and cuts them into vertical Shorts. YouTube\'s viewer Clip button, where it still appears, only makes a shareable link.',
  },
  {
    q: 'How do I cut a clip from a YouTube video?',
    a: 'Get a copy of the video you own or are licensed to use (YouTube Studio lets you download your own uploads), then cut it: ffmpeg -ss 00:01:30 -to 00:02:15 -i input.mp4 -c copy clip.mp4 keeps the part between 1:30 and 2:15 without re-encoding. Any free trimmer such as QuickTime, the Windows Photos app or your phone\'s gallery does the same with a slider.',
  },
  {
    q: 'How do I copy a video clip from YouTube?',
    a: 'To share a moment, use Share and tick "Start at" to copy a link that opens the video at that second. To get an actual file, you need a video you own or have permission to use: download your own upload from YouTube Studio, or use the creator\'s licence (for example Creative Commons), then trim it.',
  },
  {
    q: 'How do I take a clip from a YouTube video for TikTok or Shorts?',
    a: 'Cut the segment, then reframe it from 16:9 to 9:16 and add captions. You can do it by hand with an editor or ffmpeg, or paste the link into an AI clipper like OpenShorts, which picks 3 to 15 moments of 15 to 60 seconds, reframes them with face tracking and burns in word-level subtitles.',
  },
  {
    q: 'How do I save a clip of a YouTube video?',
    a: 'A YouTube Clip or a timestamp link is not a file; it plays the original video on YouTube and disappears if the video is removed. To keep a clip, save a trimmed copy of a video you have the rights to on your own device, with Studio\'s download plus a trimmer, or with ffmpeg.',
  },
  {
    q: 'Is YouTube Clips gone?',
    a: 'In April 2026 YouTube announced it was discontinuing the viewer Clips feature and making Share at timestamp, now on mobile too, the main way to share a moment. Creators keep the Video Clips tool in YouTube Studio for republishing parts of their own longer videos and archived streams. Availability can differ by account and region.',
  },
  {
    q: 'Can I clip someone else\'s YouTube video?',
    a: 'Sharing a link or timestamp is fine. Downloading, re-uploading or monetising a cut of someone else\'s video needs their permission or a licence that allows it, such as Creative Commons Attribution; YouTube\'s Terms of Service restrict downloading, and fair use is a narrow defence decided case by case, not a rule you can count on.',
  },
  {
    q: 'Can I clip a YouTube video on my phone?',
    a: 'Yes. Share at timestamp works in the mobile apps. For your own videos, the YouTube Studio app and the YouTube app\'s Shorts tools let you reuse parts of your uploads. For a file you have the rights to, the trim tool in the iPhone Photos app or Google Photos cuts it in seconds.',
  },
]

const howToClip = () => ({
  path: '/how-to-clip-a-youtube-video',
  title: 'How to Clip a YouTube Video in 2026 (4 Ways, Free)',
  description:
    'Four free ways to clip a YouTube video: share a moment, edit your own in YouTube Studio, cut it with ffmpeg or a free trimmer, or let AI cut it into Shorts.',
  h1: 'How to clip a YouTube video: 4 free ways, from a link to a vertical Short',
  breadcrumb: [{ name: 'How to clip a YouTube video' }],
  published: PUBLISHED,
  updated: PUBLISHED,
  cta: {
    label: 'The fast way',
    title: 'Paste a YouTube link, get vertical clips',
    body: `OpenShorts finds the best moments and cuts them into 9:16 Shorts with captions. First video free up to ${FIRST_VIDEO_MINUTES} minutes, no credit card; self-hosted it is free under MIT.`,
    button: 'Clip a video',
  },
  tldr: [
    'There are four ways to clip a YouTube video, and which one you want depends on whether you need a <strong>link</strong>, a <strong>file</strong> or a <strong>vertical Short</strong>.',
    '<strong>1.</strong> Share a moment: the Clip button where you still see it, or Share at timestamp. <strong>2.</strong> YouTube Studio, for videos on your own channel. <strong>3.</strong> Cut the segment yourself with a free trimmer or one ffmpeg command. <strong>4.</strong> Let AI find the best moments and cut them into 9:16 Shorts with captions, with OpenShorts.',
    'Only clip content you own or have the rights to use. A link to someone else\'s video is fine; a downloaded and re-uploaded cut of it usually is not.',
  ],
  body: `
<h2>Which method should you use?</h2>
<table>
<thead><tr><th>You want</th><th>Method</th><th>Gives you</th><th>Works on</th></tr></thead>
<tbody>
<tr><td class="os">To send a friend one moment</td><td>1. Clip button or Share at timestamp</td><td>A link</td><td>Any public video</td></tr>
<tr><td class="os">To shorten or reuse your own upload</td><td>2. YouTube Studio</td><td>An edited video or a republished clip on YouTube</td><td>Your own channel</td></tr>
<tr><td class="os">An exact segment as a file</td><td>3. Free trimmer or ffmpeg</td><td>An MP4 on your device</td><td>Videos you own or are licensed to use</td></tr>
<tr><td class="os">Several Shorts from a long video</td><td>4. AI clipping (OpenShorts)</td><td>Vertical 9:16 clips with captions</td><td>Videos you own or are licensed to use</td></tr>
</tbody>
</table>
<p>Before any of them, find the exact moment. Scrub the timeline, or open the
transcript (the "Show transcript" button in the description) and search for a
phrase you remember: every line has a timestamp. Write down the start and end
time, to the second.</p>

<h2>Method 1: share a moment with the Clip button or a timestamp</h2>
<p>For years YouTube had a <strong>Clip</strong> button (the scissors icon under
the player) that let a viewer select a short stretch of a video, give it a
title and share it as a link. In April 2026 YouTube announced it was
discontinuing viewer Clips and making <strong>Share at timestamp</strong> the
main way to share a moment, now in the mobile apps as well as on desktop.
Rollouts are gradual, so what you see depends on your account and region.</p>
<p>If you still see the Clip button under a video:</p>
<ol>
<li>Click or tap <strong>Clip</strong>.</li>
<li>Drag the selection to the stretch you want and add a title.</li>
<li>Click <strong>Share clip</strong> and copy the link.</li>
</ol>
<p>If you do not, use a timestamp link, which does the same job for most people:</p>
<ol>
<li>Pause the video at the moment you want.</li>
<li>Click <strong>Share</strong>, tick <strong>Start at</strong> (it fills in the current time) and copy the link. On a phone, use the same option in the Share sheet where it is available.</li>
<li>Or add it by hand: append <code>&amp;t=95</code> (seconds) to a youtube.com/watch link, or <code>?t=95</code> to a youtu.be link.</li>
</ol>
<p>Both give you a <strong>link, not a file</strong>. The viewer watches the
original video on YouTube, the creator keeps the view, and if the video is
removed or made private the link stops working. That makes it the right method
for sharing and the wrong one for making your own content.</p>

<h2>Method 2: YouTube Studio, for videos on your own channel</h2>
<p>If the video is yours, YouTube Studio has three tools that cover most needs.</p>
<h3>Trim your upload in the Studio editor</h3>
<ol>
<li>Open YouTube Studio, go to <strong>Content</strong> and click the video.</li>
<li>Choose <strong>Editor</strong> in the left menu, then <strong>Trim &amp; cut</strong>.</li>
<li>Drag the edges to keep the part you want, or add cuts to remove stretches in the middle, then <strong>Save</strong>.</li>
</ol>
<p>This edits the published video itself; it does not create a second one. The
change takes a while to process, the URL and views stay the same, and some
videos cannot be edited (Studio tells you when). Keep a copy of the original
first if you might want it back.</p>
<h3>Republish part of a video with Video Clips</h3>
<p>YouTube Studio also has a <strong>Video Clips</strong> tool for creators,
which YouTube describes as letting you republish clips from your longer videos
and archived live streams. YouTube has said it will extend it to Shorts. Where
it is available on your channel, it is the most direct way to turn one segment
of your own video into its own upload without downloading anything.</p>
<h3>Download your own video to edit elsewhere</h3>
<p>In <strong>Content</strong>, open the three-dot menu on a video and choose
<strong>Download</strong>. You get an MP4 of your own upload, which you can then
cut with method 3 or clip with method 4. This is the clean, permitted way to get
a file of a YouTube video: it is your video, and Studio hands it to you.</p>

<h2>Method 3: cut the segment yourself, free</h2>
<p>Once you have a file you have the rights to (your own Studio download, your
original recording, or a video under a licence such as Creative Commons
Attribution), cutting a segment out takes seconds.</p>
<h3>With a free trimmer</h3>
<ul>
<li><strong>Mac:</strong> open the file in QuickTime Player, choose Edit, Trim, drag the yellow handles and save.</li>
<li><strong>Windows:</strong> open it in the Photos app or Clipchamp, which ship with Windows 11, and use Trim.</li>
<li><strong>iPhone:</strong> in Photos, tap Edit and drag the ends of the timeline; save as a new clip to keep the original.</li>
<li><strong>Android:</strong> in Google Photos, tap Edit and drag the trim handles, then Save copy.</li>
</ul>
<h3>With ffmpeg, to the exact second</h3>
<p>ffmpeg is free, runs on every operating system and is the tool most video
software uses underneath. This keeps the part from 1:30 to 2:15 without
re-encoding, so it is instant and lossless:</p>
<pre><code>ffmpeg -ss 00:01:30 -to 00:02:15 -i input.mp4 -c copy clip.mp4</code></pre>
<p>With <code>-c copy</code> the cut snaps to the nearest keyframe, so it can start
a fraction of a second early. For a frame-exact cut, re-encode instead:</p>
<pre><code>ffmpeg -ss 00:01:30 -to 00:02:15 -i input.mp4 -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 160k clip.mp4</code></pre>
<p>And to turn a 16:9 segment into a centred 9:16 vertical clip for Shorts, TikTok
or Reels:</p>
<pre><code>ffmpeg -ss 00:01:30 -to 00:02:15 -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:v libx264 -crf 18 -c:a aac clip_vertical.mp4</code></pre>
<p>A fixed centre crop works when the speaker stays in the middle. When they
move, or there are two people on screen, a static crop cuts someone off, and
that is the point where doing it by hand stops scaling. If you only need the
format change, the free <a href="/video-aspect-ratio-converter">16:9 to 9:16
converter</a> does it in your browser.</p>
<p>For a Creative Commons video or your own upload, yt-dlp can download just the
part you need instead of the whole file:
<code>yt-dlp --download-sections "*00:01:30-00:02:15" &lt;video-url&gt;</code>. Use it
only where you have the rights; YouTube's Terms of Service restrict downloading
other people's videos.</p>

<h2>Method 4: let AI find the best moments and cut them into Shorts</h2>
<p>Methods 1 to 3 assume you already know which 30 seconds you want. With a
45-minute podcast or a two-hour stream, finding them is the real work. An AI
clipper does that part: it reads the whole video and returns the strongest
moments already cut, reframed and captioned.</p>
<p>With OpenShorts:</p>
<ol>
<li>Paste the YouTube link (or upload the file) at openshorts.app, or in your own self-hosted copy.</li>
<li>The video is transcribed with a timestamp for every word and scanned for scene cuts.</li>
<li>Google Gemini scores the transcript and picks the 3 to 15 strongest moments, each 15 to 60 seconds, that make sense on their own.</li>
<li>Each moment is cut and reframed to 9:16: face tracking for one speaker, both people stacked for a two-person podcast, the screen above the presenter for a tutorial.</li>
<li>Subtitles are burned in from the word-level transcript, with a hook line on the first seconds. Download the clips, or post them to YouTube Shorts, TikTok and Instagram Reels.</li>
</ol>
<p>The same rights rule applies: use it on your own videos, on channels you
manage, or on footage you are licensed to clip. The details for YouTube sources
are on <a href="/youtube-clip-maker">the YouTube clip maker</a> page, and for
turning a channel's long videos into Shorts, see
<a href="/youtube-shorts-maker">the YouTube Shorts maker</a> and
<a href="/youtube-to-shorts-converter">the YouTube to Shorts converter</a>.</p>
<p>What it costs: OpenShorts self-hosted is free and open source under MIT, with
no watermark and no cap. OpenShorts Cloud clips your first video free up to
${FIRST_VIDEO_MINUTES} minutes, then ${FREE.monthly.minutes} minutes a month with a
watermark, and paid plans start at ${money(STARTER.monthly)}/month without one
(<a href="/pricing">all plans</a>).</p>

<h2>Copyright: what you are allowed to clip</h2>
<p>The method is the easy part. Whether you may use the clip is the one that gets
channels struck.</p>
<ul>
<li><strong>Sharing a link or timestamp</strong> to any public video is fine: it plays the original, on YouTube, credited to the creator.</li>
<li><strong>Your own videos</strong> are yours to cut, download from Studio and repost anywhere.</li>
<li><strong>Licensed videos</strong>, such as those marked Creative Commons Attribution (CC BY) in YouTube's description panel, can be reused if you credit the creator as the licence requires.</li>
<li><strong>Someone else's video</strong> needs their permission to download, re-upload or monetise. Many creators run clipping programmes and say so in their description; ask if not.</li>
<li><strong>Fair use</strong> (commentary, criticism, news) is a legal defence judged case by case, not a licence. Do not build a channel on the assumption that it covers you.</li>
</ul>
<p>Re-uploading other people's clips without permission also tends to trip
YouTube's reused-content rules for monetisation, independent of copyright.</p>

<h2>Clipping on mobile vs desktop</h2>
<p><strong>On a phone</strong>, sharing is the strong suit: Share at timestamp
from the Share sheet, and the YouTube and YouTube Studio apps for reusing parts
of your own uploads in Shorts. For a file you already have, the trim tools in
Photos and Google Photos are the quickest way to cut it.</p>
<p><strong>On a desktop</strong>, you get the full Studio editor, frame-exact
cuts with ffmpeg and a mouse for precise trimming. Long videos are also easier
to scrub on a big timeline. An AI clipper works the same on both, since the
processing happens on the server (or on your own machine when self-hosted).</p>

<h2>Common mistakes when clipping YouTube videos</h2>
<ul>
<li><strong>Cutting mid-sentence.</strong> Start a beat before the first word and end after the last one. A transcript with word timestamps makes this exact.</li>
<li><strong>Keeping 16:9 for Shorts.</strong> A horizontal clip in a vertical feed is a small box between black bars. Reframe to 9:16.</li>
<li><strong>No captions.</strong> Most short-form video is watched on mute. Burn subtitles in.</li>
<li><strong>Clips that need context.</strong> A moment that only makes sense after the previous ten minutes will not hold a stranger. Pick moments that stand alone.</li>
</ul>

${faqBlock(HOWTO_FAQ)}

${sources([
  'YouTube discontinuing viewer Clips in favour of Share at timestamp, and the Studio Video Clips tool: <a href="https://9to5google.com/2026/04/17/youtube-clips-share-at-time-changes/" rel="noopener">9to5Google, 17 April 2026</a>; <a href="https://www.tubefilter.com/2026/04/17/youtube-clipping-tool-viewer-clips-shorts/" rel="noopener">Tubefilter, 17 April 2026</a>.',
  'ffmpeg options <code>-ss</code>, <code>-to</code> and <code>-c copy</code>: <a href="https://ffmpeg.org/ffmpeg.html" rel="noopener">ffmpeg documentation</a>.',
  `OpenShorts pipeline: <a href="/how-openshorts-works">how OpenShorts works</a> and the <a href="${SITE.repo}" rel="noopener">source on GitHub</a>.`,
])}
`,
  faq: HOWTO_FAQ,
  extraNodes: [
    {
      '@type': 'HowTo',
      '@id': `${SITE.url}/how-to-clip-a-youtube-video#howto`,
      name: 'How to clip a YouTube video',
      description:
        'Cut a segment out of a YouTube video you own or are licensed to use, and turn it into a vertical clip for Shorts, TikTok or Reels.',
      totalTime: 'PT10M',
      supply: [{ '@type': 'HowToSupply', name: 'A YouTube video you own or have the rights to clip' }],
      tool: [
        { '@type': 'HowToTool', name: 'YouTube Studio' },
        { '@type': 'HowToTool', name: 'ffmpeg or a free video trimmer' },
        { '@type': 'HowToTool', name: 'OpenShorts (optional, for AI clipping)' },
      ],
      step: [
        {
          '@type': 'HowToStep',
          name: 'Find the moment',
          text: 'Scrub the timeline or search the video transcript for a phrase, and note the start and end time to the second.',
        },
        {
          '@type': 'HowToStep',
          name: 'Share it, or get a copy you have the rights to',
          text: 'To share, use Share with Start at for a timestamp link. To make a clip, download your own upload from YouTube Studio (Content, three-dot menu, Download), or use footage you are licensed to reuse.',
        },
        {
          '@type': 'HowToStep',
          name: 'Cut the segment',
          text: 'Trim it in QuickTime, the Windows Photos app or your phone gallery, or run: ffmpeg -ss 00:01:30 -to 00:02:15 -i input.mp4 -c copy clip.mp4',
        },
        {
          '@type': 'HowToStep',
          name: 'Make it vertical and add captions',
          text: 'For Shorts, TikTok or Reels, reframe the clip from 16:9 to 9:16 and burn in subtitles, by hand or with an AI clipper such as OpenShorts that also picks the moments.',
        },
        {
          '@type': 'HowToStep',
          name: 'Export and post',
          text: 'Save the clip as MP4 and upload it, crediting the original creator where the licence requires.',
        },
      ],
    },
  ],
  related: ['/youtube-clip-maker', '/youtube-shorts-maker', '/youtube-to-shorts-converter'],
})

export function guidePages() {
  return [pricing(), selfHosted(), freeCompared(), howToClip()]
}
