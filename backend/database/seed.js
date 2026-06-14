// ─── Platoons X — Content seed ───────────────────────────────────────────────
// Migrates the site's current hardcoded content into the database so the public
// site looks identical on day one. Idempotent: each table is only seeded when
// empty, so re-running never duplicates rows.
//
// Run:  npm run db:seed   (run db:init first, or it runs automatically here)

require('dotenv').config();
const { query, closePool } = require('./connection');
const { initDatabase } = require('./init');

async function isEmpty(table) {
  const rows = await query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return rows[0].c === 0;
}

async function seedTable(table, label, fn) {
  if (await isEmpty(table)) {
    await fn();
    console.log(`  + seeded ${label}`);
  } else {
    console.log(`  · ${label} already has data — skipped`);
  }
}

// ── Data mirrored from index.html / script.js / asset-code-pricing.html ──

const services = [
  ['01', '🔍', '↑ 3x Avg. Organic Traffic', 'Search Engine Optimization',
    'Rank #1 on Google and stay there. We build sustainable organic growth through technical SEO, content strategy, backlinks, and local SEO · so Bangalore customers find you first, every time.',
    ['On-Page SEO', 'Technical SEO', 'Local SEO', 'Link Building', 'Google Business']],
  ['02', '📢', '↓ 40% Lower Cost Per Lead', 'Paid Advertising (PPC)',
    'Google Ads & Meta Ads campaigns that convert. We manage every rupee for maximum ROI, targeting buyers across Bangalore and India.',
    ['Google Ads', 'Meta Ads', 'Retargeting', 'Lead Gen']],
  ['03', '📱', '↑ 5x Engagement Rate', 'Social Media Management',
    'Build a brand people love. We handle content creation, community management, and growth strategy across Instagram, LinkedIn, Facebook, and more.',
    ['Instagram', 'LinkedIn', 'Reels', 'Content Creation']],
  ['04', '🤖', '24/7 Automated Sales', 'AI & WhatsApp Automation',
    'Automated sales funnels via WhatsApp, chatbots, and AI workflows. Qualify leads, send follow-ups, and close deals · all on autopilot.',
    ['WhatsApp Bot', 'Lead Automation', 'CRM Integration', 'n8n Flows']],
  ['05', '✍️', '↑ 2x Domain Authority', 'Content Marketing',
    'Blogs, videos, email sequences, and landing pages that rank, engage, and convert. Content that builds authority and drives consistent traffic.',
    ['Blog Writing', 'Email Campaigns', 'Video Scripts', 'Copywriting']],
  ['06', '📊', '100% Transparent Reporting', 'Analytics & Reporting',
    "Real-time dashboards and monthly reports that show exactly what's working. No guesswork · data-driven decisions that multiply your marketing ROI and keep you in control of every campaign.",
    ['GA4 Setup', 'Monthly Reports', 'Conversion Tracking', 'ROI Analysis', 'Heatmaps']],
  ['07', '💻', '⚡ Fast, Mobile-First Websites', 'Website Design, Development & Hosting',
    'From stunning landing pages to full business websites, we design, build, and host high-converting sites that load fast, look great on every device, and turn visitors into customers.',
    ['Custom Design', 'Responsive UI', 'Landing Pages', 'Web Hosting', 'Speed Optimisation']],
];

const pricingPlans = [
  {
    tier: 'Starter', price_monthly: '12,999', price_quarterly: '11,049',
    emi_text: 'EMI from ₹1,083/mo · 0% interest', is_featured: 0, cta_label: 'Get Started',
    description: 'Perfect for small businesses and startups looking to establish their digital presence in Bangalore.',
    features: [
      ['SEO (10 Keywords)', 1], ['Google My Business Setup', 1], ['12 Social Media Posts/mo', 1],
      ['Monthly Analytics Report', 1], ['1 Blog Post/mo', 1],
      ['Paid Ads Management', 0], ['WhatsApp Automation', 0],
    ],
  },
  {
    tier: 'Growth', price_monthly: '27,999', price_quarterly: '23,799',
    emi_text: 'EMI from ₹2,333/mo · 0% interest', is_featured: 1, cta_label: 'Start Growing →',
    description: 'For growing businesses ready to scale leads, conversions, and brand awareness across channels.',
    features: [
      ['SEO (25 Keywords)', 1], ['Google Ads Management', 1], ['Meta Ads (Facebook + Instagram)', 1],
      ['20 Social Media Posts/mo', 1], ['4 Blog Posts/mo', 1],
      ['WhatsApp Automation (Basic)', 1], ['Weekly Reports + Strategy Call', 1],
    ],
  },
  {
    tier: 'Dominate', price_monthly: '54,999', price_quarterly: '46,749',
    emi_text: 'EMI from ₹4,583/mo · 0% interest', is_featured: 0, cta_label: 'Go Premium',
    description: 'Full-stack digital domination for ambitious brands. Everything in Growth, plus AI automation and priority support.',
    features: [
      ['SEO (50 Keywords + Technical)', 1], ['Full PPC Management (Google + Meta)', 1],
      ['30 Social Posts + Reels/Shorts', 1], ['8 Blog Posts/mo', 1],
      ['AI WhatsApp Automation (Advanced)', 1], ['CRM + Lead Flow Automation', 1],
      ['Dedicated Account Manager', 1],
    ],
  },
];

const team = [
  ['K. Sharath Chandra', 'Chief Executive Officer', 'SC', 'var(--orange)',
    "Visionary strategist and SEO expert driving Platoons X's growth mission. Specializes in digital strategy, content, and building data-driven marketing systems that scale.",
    'https://www.linkedin.com/in/sharath-chandra-kotta-59a536212/'],
  ['T. Chandrakanth', 'Chief Financial Officer', 'TC', 'var(--purple)',
    'Financial architect ensuring every campaign delivers measurable ROI. Brings deep expertise in budget optimization, performance analytics, and business profitability.',
    '#'],
  ['Pooja Vishwakarma', 'Head of Creative Strategy', 'P', 'var(--cyan)',
    "Creative powerhouse behind Platoons X's most impactful campaigns. Expert in brand storytelling, social media virality, and designing digital experiences that captivate audiences.",
    '#'],
];

const testimonials = [
  ['Platoons X transformed our online presence completely. Our organic traffic grew 280% in just 4 months. The team is responsive, data-driven, and truly cares about results.', 'Rajesh Kumar', 'Owner, Bangalore Pharma Pvt Ltd', 'RK', 'var(--orange)'],
  ['Our Google Ads cost-per-lead dropped by 60% after Platoons X took over. Their keyword strategy and landing page tweaks made an immediate difference.', 'Rahul Verma', 'Founder, SaaS Startup, Bangalore', 'RV', 'var(--cyan)'],
  ['From zero to 12,000 Instagram followers in 3 months. Their content strategy and community management is genuinely world-class.', 'Sneha Gupta', 'Co-Founder, Lifestyle Brand, Mumbai', 'SG', 'var(--gold)'],
  ['The WhatsApp automation they built for us is a game changer. We went from responding to 10 inquiries a day manually to handling 150+ automatically. Pure ROI.', 'Sravani Patel', 'Founder, EduTech Startup, Bangalore', 'SP', 'var(--purple)'],
  ['Our real estate listings started ranking on page 1 for high-intent keywords in under 10 weeks. The local SEO work Platoons X did is driving quality walk-ins every single week.', 'Kiran Reddy', 'Director, Prime Properties, Bangalore', 'KR', 'var(--orange)'],
  ['The analytics dashboards Platoons X set up give me full visibility into what\'s working. For the first time I actually understand where every rupee is going.', 'Vikram Singh', 'MD, Singh Manufacturing, Pune', 'VS', 'var(--cyan)'],
  ['Our Meta Ads ROAS jumped from 1.8x to 5.2x within 6 weeks of them taking over. They test aggressively and optimize fast. Best marketing investment we\'ve made.', 'Arjun Mehta', 'CEO, D2C Fashion Brand, Bangalore', 'AM', 'var(--cyan)'],
  ['Platoons X redesigned our brand\'s digital identity and the results were immediate - better engagement, more DMs, and a 40% jump in footfall to our clinic.', 'Deepika Nair', 'Owner, Nair Wellness Clinic, Chennai', 'DN', 'var(--gold)'],
  ['We partnered with Platoons X for our restaurant chain\'s social media. Within 2 months, our reservation bookings through Instagram doubled. Absolute professionals.', 'Priya Sharma', 'Operations Head, Spice Route Restaurants', 'PS', 'var(--purple)'],
];

const faqs = [
  ['How long before I see results?', 'SEO results typically show in 2–4 months. Paid ads can generate leads from Day 1. Social media and content marketing show compounding results over 3–6 months. We set realistic expectations during your onboarding call.'],
  ['Do you have EMI options?', 'Yes! We offer 0% interest EMI plans for all our packages starting at just ₹1,083/month. We partner with leading banks and payment platforms. Ask our team for details during your consultation.'],
  ['Is ad spend included in your pricing?', 'No · our pricing covers management fees, strategy, and execution. Your ad spend (Google/Meta budget) is separate and paid directly to the platforms. We recommend a minimum ad budget based on your goals.'],
  ['Do you work with businesses outside Bangalore?', "Absolutely. While we're headquartered in Bangalore, we serve clients across India's major cities and have experience with pan-India and international campaigns."],
  ['What makes Platoons X different from other agencies?', "We're lean, fast, and obsessed with results. No bloated teams, no account-manager middlemen. You work directly with the strategists executing your campaigns. Plus, our AI automation capabilities are ahead of 95% of local agencies."],
  ['Can I get a free audit?', "Yes! We offer a complimentary 30-minute digital audit for new prospects. We'll analyse your current SEO, social, and ad performance and share a growth roadmap · no strings attached."],
  ['What industries do you specialise in?', "We've worked with real estate, healthcare, education, e-commerce, B2B SaaS, restaurants, and professional services. Our data-driven approach adapts to any industry and market."],
  ['What is the minimum contract period?', 'We recommend a minimum 3-month engagement to see meaningful results, especially for SEO. For Paid Ads and Automation projects, we offer monthly rolling contracts after an initial setup phase.'],
];

const processSteps = [
  [1, 'Discovery Call', 'Free · 30 min', '🔍', '#FF5C1A', 'rgba(255,92,26,0.4)', [2],
    'We learn your business, goals, target audience, and current digital presence in a zero-pressure 30-minute audit call. No pitches - just clarity on where you stand and where you could be.'],
  [2, 'Deep Audit', 'Day 1–2', '🔬', '#7C3AED', 'rgba(124,58,237,0.4)', [1, 3],
    'Full teardown of your website health, SEO gaps, ad account structure, social performance, and competitor landscape. We find exactly where your money is leaking and where the real opportunity is.'],
  [3, 'Custom Strategy', 'Week 1', '🗺️', '#00D4FF', 'rgba(0,212,255,0.35)', [2, 4],
    'A tailored 90-day growth roadmap covering channel mix, content calendar, budget allocation, KPIs, and measurable milestones - built specifically for your business goals.'],
  [4, 'Brand & Creative', 'Week 1–2', '🎨', '#F5C518', 'rgba(245,197,24,0.35)', [3, 5],
    'We develop your ad creatives, social templates, video scripts, landing page copy, and brand visuals - everything aligned to your voice and engineered to convert.'],
  [5, 'Campaign Launch', 'Week 2', '🚀', '#FF5C1A', 'rgba(255,92,26,0.4)', [4, 6],
    'Campaigns go live across Google, Meta, Instagram - wherever your audience lives. SEO work begins. WhatsApp automation deploys. Every piece runs on the roadmap with precision.'],
  [6, 'Optimize & Test', 'Ongoing', '⚡', '#7C3AED', 'rgba(124,58,237,0.4)', [5, 7],
    'Daily performance monitoring, weekly A/B tests on creatives and targeting, and rapid creative iteration to squeeze maximum ROI from every rupee spent.'],
  [7, 'Scale & Report', 'Monthly', '📈', '#22c55e', 'rgba(34,197,94,0.35)', [6, 1],
    "Monthly strategy reviews, transparent performance dashboards, and scaling what's working - so your growth compounds month after month with zero guesswork."],
];

const aiFeatures = [
  ['photos/whatsapp.png', 'WhatsApp Automation', 'Instant replies, lead qualification, and booking confirmations via WhatsApp Business API.'],
  ['🤖', 'AI Chatbot', 'Website chatbots trained on your business that convert visitors to leads automatically.'],
  ['🔄', 'CRM Workflows', 'Automated lead follow-ups, pipeline updates, and customer onboarding flows.'],
  ['📲', 'Broadcast Campaigns', 'Targeted WhatsApp broadcasts with 90%+ open rates that re-engage your audience instantly.'],
  ['🎯', 'Lead Gen Automation', 'Capture, score, and route leads from ads, forms, and landing pages automatically.'],
  ['🖼️', 'Thumbnail Creation', 'Scroll-stopping thumbnails crafted to maximise clicks on YouTube, ads, and social.'],
  ['✍️', 'Copywriting', 'High-converting copy for ads, emails, and landing pages - written to sell.'],
  ['photos/N8N.png', 'N8N Automations', 'Custom workflows connecting your CRM, ads, email, and WhatsApp - zero manual work.'],
];

// section, value, suffix, label
const stats = [
  ['hero', '200', '+', 'Clients Scaled'],
  ['hero', '5', '×', 'Avg. ROI Delivered'],
  ['hero', '98', '%', 'Client Retention'],
  ['results', '₹2.4', 'Cr+', 'Revenue Generated for Clients'],
  ['results', '5', '×', 'Average ROAS on Ad Campaigns'],
  ['results', '312', '%', 'Average Organic Traffic Growth'],
  ['results', '48', 'hr', 'Average Campaign Go-Live Time'],
];

const pillars = [
  ['01', '📍', '200+', 'Local businesses grown', 'Bangalore-First Mindset',
    "Deep understanding of local markets, Kannada audience psychology, and Bangalore's startup ecosystem that national agencies miss entirely."],
  ['02', '⚡', '10×', 'Faster than traditional', 'AI-Augmented Execution',
    'Cutting-edge AI tools that let us move faster and smarter than conventional agencies · without sacrificing creativity.'],
  ['03', '📈', '₹0', 'Hidden fees. Ever.', '100% Transparent',
    'Weekly check-ins, live dashboards, and brutally honest reporting. You always know exactly where every rupee goes.'],
  ['04', '🤝', 'EMI', 'Plans from ₹1,667/mo', 'Flexible for Every Budget',
    'Every business deserves world-class marketing. Affordable packages with 0% EMI options so growth is never out of reach.'],
];

const settings = {
  contact_email: 'ksharath2003@gmail.com',
  contact_phone: '+91 91217 26376',
  whatsapp_number: '919121726376',
  location: 'Bangalore, Karnataka, India',
  business_hours: 'Mon – Sat, 9:00 AM – 7:00 PM IST',
  linkedin_url: 'https://www.linkedin.com/in/sharath-chandra-kotta-59a536212/',
  instagram_url: 'https://www.instagram.com/sharath._.chandra/',
  hero_badge: "🚀 Bangalore's Digital Growth Agency",
};

async function seed() {
  console.log('🌱 Seeding Platoons X content…');
  await initDatabase(); // make sure tables exist

  await seedTable('services', 'services', async () => {
    let i = 0;
    for (const [number, icon, metric, title, description, tags] of services) {
      await query(
        `INSERT INTO services (number, icon, metric, title, description, tags, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [number, icon, metric, title, description, JSON.stringify(tags), i++]
      );
    }
  });

  await seedTable('pricing_plans', 'pricing plans + features', async () => {
    let i = 0;
    for (const p of pricingPlans) {
      const res = await query(
        `INSERT INTO pricing_plans
           (tier, price_monthly, price_quarterly, emi_text, description, cta_label, is_featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.tier, p.price_monthly, p.price_quarterly, p.emi_text, p.description, p.cta_label, p.is_featured, i++]
      );
      let j = 0;
      for (const [label, enabled] of p.features) {
        await query(
          `INSERT INTO pricing_features (plan_id, label, is_enabled, sort_order) VALUES (?, ?, ?, ?)`,
          [res.insertId, label, enabled, j++]
        );
      }
    }
  });

  await seedTable('team_members', 'team', async () => {
    let i = 0;
    for (const [name, role, initials, color, desc, url] of team) {
      await query(
        `INSERT INTO team_members (name, role, initials, avatar_color, description, linkedin_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, role, initials, color, desc, url, i++]
      );
    }
  });

  await seedTable('testimonials', 'testimonials', async () => {
    let i = 0;
    for (const [quote, author, company, initials, color] of testimonials) {
      await query(
        `INSERT INTO testimonials (quote, author_name, author_company, rating, avatar_initials, accent_color, sort_order)
         VALUES (?, ?, ?, 5, ?, ?, ?)`,
        [quote, author, company, initials, color, i++]
      );
    }
  });

  await seedTable('faqs', 'faqs', async () => {
    let i = 0;
    for (const [question, answer] of faqs) {
      await query(`INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)`, [question, answer, i++]);
    }
  });

  await seedTable('process_steps', 'process steps', async () => {
    let i = 0;
    for (const [num, title, badge, emoji, color, glow, related, content] of processSteps) {
      await query(
        `INSERT INTO process_steps (step_number, title, badge, emoji, color, glow, related_ids, content, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [num, title, badge, emoji, color, glow, JSON.stringify(related), content, i++]
      );
    }
  });

  await seedTable('ai_features', 'AI features', async () => {
    let i = 0;
    for (const [icon, title, desc] of aiFeatures) {
      await query(`INSERT INTO ai_features (icon, title, description, sort_order) VALUES (?, ?, ?, ?)`, [icon, title, desc, i++]);
    }
  });

  await seedTable('stats', 'stats', async () => {
    let i = 0;
    for (const [section, value, suffix, label] of stats) {
      await query(`INSERT INTO stats (section, value, suffix, label, sort_order) VALUES (?, ?, ?, ?, ?)`, [section, value, suffix, label, i++]);
    }
  });

  await seedTable('why_pillars', 'why pillars', async () => {
    let i = 0;
    for (const [ghost, icon, stat, sublabel, title, desc] of pillars) {
      await query(
        `INSERT INTO why_pillars (ghost_number, icon, stat, sublabel, title, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ghost, icon, stat, sublabel, title, desc, i++]
      );
    }
  });

  await seedTable('site_settings', 'site settings', async () => {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO site_settings (setting_key, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, value]
      );
    }
  });

  console.log('✅ Seed complete.');
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err.message);
      process.exit(1);
    });
}
