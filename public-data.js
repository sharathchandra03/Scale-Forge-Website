// ─── ScaleForge — Public site dynamic content loader ─────────────────────────
// Progressive enhancement: fetches content from the admin API and, ONLY on a
// successful response, swaps the matching section's items for DB-driven ones.
// If the API/DB is unavailable, the existing hardcoded HTML stays on screen —
// the site never goes blank.
//
// Notes:
//  • Injected nodes intentionally OMIT the `.reveal` class. `.reveal` starts at
//    opacity:0 and is only un-hidden by GSAP at load time; nodes added later
//    would stay invisible. So we render already-visible markup.
//  • This file is additive and never throws to the page; every section is
//    guarded independently.
//  • The contact form keeps its existing Google-Sheets behaviour (script.js);
//    we ADD a best-effort POST to /api/leads so submissions also land in the DB.

(function () {
  'use strict';

  // Same-origin by default; override only if the admin API runs elsewhere.
  var storedApiBase = '';
  try { storedApiBase = window.localStorage.getItem('admin_api_base') || ''; } catch (e) { storedApiBase = ''; }
  var API_BASE = (window.SCALEFORGE_API_BASE || storedApiBase || '').replace(/\/$/, '');

  function api(path) {
    return fetch(API_BASE + path, { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (!j || j.success === false) throw new Error('bad payload'); return j.data; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Render only when we actually got a non-empty array back.
  function withData(promise, fn) {
    promise.then(function (rows) {
      if (Array.isArray(rows) && rows.length) {
        try { fn(rows); } catch (e) { /* leave static markup intact */ }
      }
    }).catch(function () { /* offline / error → keep static markup */ });
  }

  var arrow = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  // ── Services ──
  withData(api('/api/services'), function (rows) {
    var grid = document.querySelector('.services-grid');
    if (!grid) return;
    grid.innerHTML = rows.map(function (s) {
      var tags = (s.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
      return '' +
        '<div class="service-card">' +
          '<div class="service-spotlight"></div>' +
          '<div class="service-num">' + esc(s.number || '') + '</div>' +
          '<div class="service-icon">' + esc(s.icon || '') + '</div>' +
          (s.metric ? '<div class="service-metric">' + esc(s.metric) + '</div>' : '') +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p>' + esc(s.description || '') + '</p>' +
          '<div class="service-tags">' + tags + '</div>' +
          '<div class="service-cta">Explore Service ' + arrow + '</div>' +
        '</div>';
    }).join('');
  });

  // ── Team ──
  withData(api('/api/team'), function (rows) {
    var grid = document.querySelector('.team-grid');
    if (!grid) return;
    grid.innerHTML = rows.map(function (m) {
      var color = m.avatar_color || 'var(--orange)';
      var photo = m.photo_media_id
        ? '<img src="' + API_BASE + '/api/media/' + m.photo_media_id + '" alt="' + esc(m.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">'
        : '<div class="team-avatar">' + esc(m.initials || '') + '</div>';
      var link = (m.linkedin_url && m.linkedin_url !== '#')
        ? '<div style="margin-top:16px;display:flex;gap:8px">' +
            '<a href="' + esc(m.linkedin_url) + '" target="_blank" ' +
            'style="display:flex;align-items:center;gap:6px;font-size:.78rem;color:' + color + ';border:1px solid ' + color + ';border-color:rgba(255,92,26,0.25);padding:4px 12px;border-radius:100px;transition:.2s">LinkedIn →</a>' +
          '</div>'
        : '';
      return '' +
        '<div class="team-card">' +
          '<div class="team-img">' + photo + '</div>' +
          '<div class="team-info">' +
            '<div class="team-role">' + esc(m.role || '') + '</div>' +
            '<div class="team-name">' + esc(m.name) + '</div>' +
            '<p class="team-desc">' + esc(m.description || '') + '</p>' +
            link +
          '</div>' +
        '</div>';
    }).join('');
  });

  // ── FAQs ──
  withData(api('/api/faqs'), function (rows) {
    var box = document.querySelector('.faq-questions');
    if (!box) return;
    box.innerHTML = rows.map(function (f) {
      return '' +
        '<div class="faq-item" onclick="toggleFaq(this)">' +
          '<div class="faq-q"><h3>' + esc(f.question) + '</h3><div class="faq-icon">+</div></div>' +
          '<div class="faq-a">' + esc(f.answer) + '</div>' +
        '</div>';
    }).join('');
  });

  // ── AI features ──
  withData(api('/api/ai-features'), function (rows) {
    var grid = document.querySelector('.ai-features-grid');
    if (!grid) return;
    grid.innerHTML = rows.map(function (a) {
      var icon = a.icon || '';
      var iconHtml = /\.(png|jpe?g|webp|svg|gif)$/i.test(icon) || icon.indexOf('/') !== -1
        ? '<img src="' + esc(icon) + '" alt="' + esc(a.title) + '" />'
        : esc(icon);
      return '' +
        '<div class="ai-feat-card">' +
          '<div class="icon">' + iconHtml + '</div>' +
          '<h3>' + esc(a.title) + '</h3>' +
          '<p>' + esc(a.description || '') + '</p>' +
        '</div>';
    }).join('');
  });

  // ── Why-Us pillars ──
  withData(api('/api/pillars'), function (rows) {
    var grid = document.querySelector('.why-pillars');
    if (!grid) return;
    grid.innerHTML = rows.map(function (p) {
      return '' +
        '<div class="why-pillar">' +
          '<div class="pillar-ghost">' + esc(p.ghost_number || '') + '</div>' +
          '<span class="pillar-icon">' + esc(p.icon || '') + '</span>' +
          '<div class="pillar-stat">' + esc(p.stat || '') + '</div>' +
          '<div class="pillar-sublabel">' + esc(p.sublabel || '') + '</div>' +
          '<div class="pillar-title">' + esc(p.title) + '</div>' +
          '<p class="pillar-desc">' + esc(p.description || '') + '</p>' +
        '</div>';
    }).join('');
  });

  // ── Testimonials (3 balanced columns, each duplicated for the seamless loop) ──
  withData(api('/api/testimonials'), function (rows) {
    var cols = document.querySelectorAll('.testi-col .testi-col-inner');
    if (cols.length !== 3) return; // markup changed — keep static
    var buckets = [[], [], []];
    rows.forEach(function (t, i) { buckets[i % 3].push(t); });

    function card(t) {
      return '' +
        '<div class="testi-card">' +
          '<div class="stars">★★★★★</div>' +
          '<p class="testi-text">"' + esc(t.quote) + '"</p>' +
          '<div class="testi-author">' +
            '<div class="testi-avatar" style="color:' + (t.accent_color || 'var(--orange)') + '">' + esc(t.avatar_initials || '') + '</div>' +
            '<div><div class="testi-name">' + esc(t.author_name) + '</div>' +
            '<div class="testi-co">' + esc(t.author_company || '') + '</div></div>' +
          '</div>' +
        '</div>';
    }
    buckets.forEach(function (bucket, i) {
      if (!bucket.length) return;
      var set = bucket.map(card).join('');
      cols[i].innerHTML = set + set; // duplicate for the CSS marquee loop
    });
  });

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
      }
    }
    return [];
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function stripHtml(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function blogCover(post) {
    if (!post || !post.cover_media_id) {
      return '<div class="blog-cover-empty">ScaleForge</div>';
    }
    return '<img src="' + API_BASE + '/api/media/' + post.cover_media_id + '" alt="' + esc(post.title || 'Blog post') + '">';
  }

  function blogTags(post) {
    var tags = toArray(post && post.tags);
    if (!tags.length) return '';
    return '<div class="blog-tags">' + tags.map(function (tag) {
      return '<span class="blog-tag">' + esc(tag) + '</span>';
    }).join('') + '</div>';
  }

  function blogCard(post, featured) {
    var href = '/blog/' + encodeURIComponent(post.slug || post.id || 'post');
    var summary = post.excerpt || stripHtml(post.body || '') || 'Open the full article for the details.';
    return '' +
      '<article class="blog-card' + (featured ? ' blog-card-featured' : '') + '">' +
        '<a class="blog-cover" href="' + href + '">' + blogCover(post) + '</a>' +
        '<div class="blog-body">' +
          '<div class="blog-meta"><span>' + esc(post.category || 'Blog') + '</span><span>' + esc(formatDate(post.publish_date || post.created_at)) + '</span></div>' +
          '<h3><a href="' + href + '">' + esc(post.title || 'Untitled post') + '</a></h3>' +
          '<p>' + esc(summary.slice(0, featured ? 180 : 150)) + '</p>' +
          blogTags(post) +
          '<a class="blog-link" href="' + href + '">Read article ' + arrow + '</a>' +
        '</div>' +
      '</article>';
  }

  function renderBlogList(rows, target, featuredOnly) {
    if (!target) return;
    if (!Array.isArray(rows) || !rows.length) {
      target.innerHTML = '<div class="blog-empty">No blog posts published yet. Add one in the admin panel and it will show up here automatically.</div>';
      return;
    }
    var items = featuredOnly ? rows.slice(0, 3) : rows;
    target.innerHTML = items.map(function (post, index) {
      return blogCard(post, featuredOnly && index === 0);
    }).join('');
  }

  var blogHighlights = document.getElementById('blogHighlights');
  var blogListGrid = document.getElementById('blogListGrid');
  var blogDetail = document.getElementById('blogDetail');

  if (blogHighlights || blogListGrid || blogDetail) {
    api('/api/blog').then(function (rows) {
      renderBlogList(rows, blogHighlights, true);
      if (blogListGrid && !window.location.pathname.match(/\/blog\/[^/]+$/)) {
        renderBlogList(rows, blogListGrid, false);
      }
    }).catch(function () {
      renderBlogList([], blogHighlights, true);
      renderBlogList([], blogListGrid, false);
    });
  }

  if (blogDetail) {
    var slug = decodeURIComponent((window.location.pathname.split('/').filter(Boolean).pop() || '')).trim();
    if (slug && slug !== 'blog') {
      api('/api/blog/' + encodeURIComponent(slug)).then(function (post) {
        if (!post) {
          blogDetail.innerHTML = '<div class="blog-empty"><a class="blog-back" href="/blog">← Back to blog</a><p style="margin-top:14px">This article is not available right now.</p></div>';
          return;
        }
        document.title = post.title ? post.title + ' | ScaleForge Blog' : document.title;
        var tags = toArray(post.tags);
        blogDetail.innerHTML = '' +
          '<article class="blog-article">' +
            '<a class="blog-back" href="/blog">← Back to blog</a>' +
            '<div class="blog-cover blog-detail-cover">' + blogCover(post) + '</div>' +
            '<div class="blog-body">' +
              '<div class="blog-meta"><span>' + esc(post.category || 'Blog') + '</span><span>' + esc(formatDate(post.publish_date || post.created_at)) + '</span></div>' +
              '<h1>' + esc(post.title || 'Untitled post') + '</h1>' +
              '<p class="blog-intro">' + esc(post.excerpt || stripHtml(post.body || '')) + '</p>' +
              (tags.length ? '<div class="blog-tags">' + tags.map(function (tag) { return '<span class="blog-tag">' + esc(tag) + '</span>'; }).join('') + '</div>' : '') +
              '<div class="blog-content">' + (post.body || '<p>Content will appear here once the post body is saved in the admin panel.</p>') + '</div>' +
            '</div>' +
          '</article>';
      }).catch(function () {
        blogDetail.innerHTML = '<div class="blog-empty"><a class="blog-back" href="/blog">← Back to blog</a><p style="margin-top:14px">Unable to load this post.</p></div>';
      });
    }
  }

  // ── Contact form → also save to DB (best-effort, non-blocking) ──
  // The existing handler in script.js still posts to Google Sheets and handles
  // all UI feedback. We only piggy-back a DB save so leads land in the admin.
  (function wireLeadMirror() {
    var btn = document.querySelector('.contact .form-submit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var lead = {
        name: g('f-name'), business_name: g('f-business'),
        email: g('f-email'), phone: g('f-phone'),
        service: document.getElementById('f-service') ? document.getElementById('f-service').value : '',
        budget: document.getElementById('f-budget') ? document.getElementById('f-budget').value : '',
        goals: g('f-goals'), source: 'website',
      };
      if (!lead.name || !lead.email || !lead.phone) return; // script.js shows the alert
      fetch(API_BASE + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }).catch(function () { /* DB offline — Sheets path still works */ });
    }, false);
  })();

  // ── Site settings → dynamic content from admin ──
  // Applies settings to the page: hero text, contact info, section visibility,
  // footer content, social links. Falls back to static HTML if API unavailable.
  api('/api/settings').then(function (data) {
    if (!data || typeof data !== 'object') return;

    // Hero section
    if (data.hero_badge) {
      var badge = document.querySelector('.hero-badge');
      if (badge) badge.innerHTML = '🚀 ' + esc(data.hero_badge);
    }
    if (data.hero_heading_1 || data.hero_heading_2 || data.hero_heading_3) {
      var h1 = document.querySelector('.hero h1');
      if (h1) {
        h1.innerHTML =
          esc(data.hero_heading_1 || 'We Make') + '<br>' +
          '<span class="line-orange">' + esc(data.hero_heading_2 || 'Brands Grow') + '</span><br>' +
          '<span class="line-grad">' + esc(data.hero_heading_3 || 'Radically.') + '</span>';
      }
    }
    if (data.hero_subtitle) {
      var sub = document.querySelector('.hero-sub');
      if (sub) sub.textContent = data.hero_subtitle;
    }
    if (data.hero_cta_primary) {
      var cta1 = document.querySelector('.hero-cta-group .btn-primary');
      if (cta1) {
        var svg = cta1.querySelector('svg');
        cta1.textContent = data.hero_cta_primary;
        if (svg) cta1.prepend(svg);
        if (data.hero_cta_primary_url) cta1.href = data.hero_cta_primary_url;
      }
    }
    if (data.hero_cta_secondary) {
      var cta2 = document.querySelector('.hero-cta-group .btn-ghost');
      if (cta2) {
        var svg2 = cta2.querySelector('svg');
        cta2.textContent = data.hero_cta_secondary;
        if (svg2) cta2.append(svg2);
        if (data.hero_cta_secondary_url) cta2.href = data.hero_cta_secondary_url;
      }
    }

    // Contact details
    if (data.contact_email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(function(a) {
        a.href = 'mailto:' + data.contact_email;
        a.textContent = data.contact_email;
      });
    }
    if (data.contact_phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function(a) {
        a.href = 'tel:' + data.contact_phone.replace(/\s/g, '');
        a.textContent = data.contact_phone;
      });
    }
    if (data.whatsapp_number) {
      document.querySelectorAll('a[href*="wa.me"]').forEach(function(a) {
        a.href = 'https://wa.me/' + data.whatsapp_number.replace(/\D/g, '');
      });
    }
    if (data.location) {
      var loc = document.querySelector('.location-badge');
      if (loc) loc.textContent = data.location;
    }

    // Footer
    if (data.footer_description) {
      var footerP = document.querySelector('.footer-brand > p');
      if (footerP) footerP.textContent = data.footer_description;
    }
    if (data.copyright_text) {
      var copy = document.querySelector('.footer-bottom p:first-child');
      if (copy) copy.textContent = data.copyright_text;
    }

    // Section visibility (hide sections if set to "no")
    function hideIf(key, selector) {
      if (data[key] && data[key].toLowerCase() === 'no') {
        var el = document.querySelector(selector);
        if (el) el.style.display = 'none';
      }
    }
    hideIf('show_blog_section', '#blog-section');
    hideIf('show_pricing_section', '.pricing');
    hideIf('show_testimonials', '.testimonials');
    hideIf('show_process', '#process');
    hideIf('show_spline_3d', '.faq-spline-wrap');

    // Announcement banner
    if (data.announcement_banner && data.announcement_banner.trim()) {
      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:1001;background:var(--orange);color:#fff;text-align:center;padding:8px 16px;font-size:.8rem;font-weight:600;font-family:var(--font-a)';
      banner.textContent = data.announcement_banner;
      if (data.announcement_url) {
        banner.style.cursor = 'pointer';
        banner.onclick = function() { window.location.href = data.announcement_url; };
      }
      document.body.prepend(banner);
      // Push nav down
      var nav = document.getElementById('navbar');
      if (nav) nav.style.top = '36px';
    }

    // Social links in footer
    if (data.linkedin_url) {
      document.querySelectorAll('.social-btn[title="LinkedIn"]').forEach(function(a) { a.href = data.linkedin_url; });
    }
    if (data.instagram_url) {
      document.querySelectorAll('.social-btn[title="Instagram"]').forEach(function(a) { a.href = data.instagram_url; });
    }

  }).catch(function () { /* offline — keep static */ });
})();
