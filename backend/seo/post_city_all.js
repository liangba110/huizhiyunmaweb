var fs2 = require('fs');
var path = require('path');
var DIST = '/data/web/huizhiyunma/frontend/dist';
var SITE = 'https://openai2000.cn';

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function sh(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function tr(s, n) { s = sh(s); return s.length > n ? s.slice(0, n) + '...' : s; }
function rc(text, cn) { return text ? text.replace(/\u9752\u5c9b/g, cn) : text; }

var citiesPath = path.join('/data/web/huizhiyunma/backend/seo', 'cities.json');
var CITIES = JSON.parse(fs2.readFileSync(citiesPath, 'utf-8'));
require('dotenv').config({ path: path.join('/data/web/huizhiyunma/backend', '.env') });
var mysql = require('mysql2/promise');

async function main() {
  var pool = mysql.createPool({ host: process.env.DB_HOST || '127.0.0.1', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', connectionLimit: 3 });
  var [articles] = await pool.query("SELECT id, title, category, summary, content, author, published_at FROM articles WHERE status = 1 ORDER BY id DESC");
  var [cases] = await pool.query("SELECT id, title, client, category, description, content FROM cases ORDER BY id DESC");
  var mainIndex = fs2.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
  console.log('DB: ' + articles.length + ' articles, ' + cases.length + ' cases');

  function cityPage(sd, cn, page, opts) {
    var SB = 'https://' + sd + '.openai2000.cn';
    var title = opts.title || '', desc = opts.description || '', kw = opts.keywords || '';
    var body = opts.body || '', jsonLd = opts.jsonLd || '';
    var canonical = SB + '/' + (page === 'index' ? '' : page);
    var navArr = [['/', '\u9996\u9875'], ['/services', '\u670d\u52a1'], ['/cases', '\u6848\u4f8b'], ['/templates', '\u6a21\u677f\u5546\u57ce'], ['/articles', '\u8d44\u8baf'], ['/about', '\u5173\u4e8e'], ['/contact', '\u8054\u7cfb']];
    var curP = page === 'index' ? '/' : '/' + page;
    var navH = navArr.map(function(n) { return '<a href="' + SB + n[0] + '"' + (n[0] === curP ? ' class="active"' : '') + '>' + n[1] + '</a>'; }).join('\n        ');
    return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '" />\n<meta name="keywords" content="' + esc(kw) + '" />\n<link rel="canonical" href="' + canonical + '" />\n<meta property="og:title" content="' + esc(title) + '" />\n<meta property="og:description" content="' + esc(desc) + '" />\n<meta property="og:url" content="' + canonical + '" />\n<meta name="robots" content="index,follow" />\n<link rel="icon" type="image/svg+xml" href="' + SITE + '/favicon.svg">\n<link rel="stylesheet" href="' + SITE + '/assets/index-CV2nLZle.css">\n<script>var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?289eab39430e2f97aa77b242004802b3";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();</script>\n' + jsonLd + '\n</head>\n<body>\n<header class="site-header"><div class="container"><div class="header-inner"><a href="' + SB + '/" class="logo"><div class="logo-icon">\u6c47</div><div class="logo-text"><strong>\u6c47\u667a\u4e91\u7801\u79d1\u6280</strong><em>HUIZHIYUNMA</em></div></a><nav class="nav">\n        ' + navH + '\n    </nav></div></div></header>\n<main>' + body + '</main>\n<footer class="site-footer"><div class="container"><div class="copyright"><p>&copy; 2026 \u6c47\u667a\u4e91\u7801\u79d1\u6280 \u7248\u6743\u6240\u6709</p></div></div></footer></body></html>';
  }

  var totalCount = 0;
  var cityCount = 0;

  for (var pi = 0; pi < CITIES.provinces.length; pi++) {
    var prov = CITIES.provinces[pi];
    for (var ci = 0; ci < prov.cities.length; ci++) {
      var city = prov.cities[ci];
      var sd = city.subdomain, cn = city.name;
      var SB = 'https://' + sd + '.openai2000.cn';
      var cityDir = path.join(DIST, 'city', sd);

      // Rebuild article pages
      var adir = path.join(cityDir, 'articles');
      fs2.rmSync(adir, { recursive: true, force: true });
      fs2.mkdirSync(adir, { recursive: true });

      for (var ai = 0; ai < articles.length; ai++) {
        var a = articles[ai];
        var aTitle = rc(a.title, cn) + '_' + cn + '_\u6c47\u667a\u4e91\u7801\u79d1\u6280';
        var aSummary = rc(a.summary, cn);
        var aContent = rc(a.content, cn);
        var aDesc = tr(aSummary, 150);
        var aKw = (a.category || '\u5c0f\u7a0b\u5e8f\u5f00\u53d1') + ',' + cn + (a.category || '');
        var aCan = SB + '/articles/' + a.id;
        var rel = articles.filter(function(x) { return x.id !== a.id && x.category === a.category; }).slice(0, 3);
        if (rel.length < 3) {
          var u = new Set(rel.map(function(x) { return x.id; }));
          u.add(a.id);
          var fl = articles.filter(function(x) { return !u.has(x.id); }).sort(function(p, q) { return (q.id || 0) - (p.id || 0); }).slice(0, 3 - rel.length);
          rel.push.apply(rel, fl);
        }
        var rH = rel.length ? '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>\u76f8\u5173\u6587\u7ae0</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + rel.map(function(x) {
          return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SB + '/articles/' + x.id + '">' + esc(rc(x.title, cn)) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(x.category) + '</p><p>' + esc(tr(rc(x.summary, cn), 80)) + '</p></article>';
        }).join('\n') + '</div></section>' : '';
        var aBody = '<nav class="breadcrumb" style="max-width:1200px;margin:0 auto;padding:16px 20px;font-size:14px;color:#6b7280;"><a href="' + SB + '/">\u9996\u9875</a> \u203a <a href="' + SB + '/articles">\u8d44\u8baf\u5217\u8868</a> \u203a ' + esc(rc(a.title, cn)) + '</nav>'
          + '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + esc(rc(a.title, cn)) + '</h1><p class="meta" style="color:#9ca3af;font-size:14px;">' + esc(a.category) + ' \u00b7 ' + esc(a.author || '\u6c47\u667a\u4e91\u7801\u79d1\u6280') + ' \u00b7 ' + String(a.published_at).slice(0, 10) + '</p></section>'
          + '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">' + (aContent || '') + '</div>'
          + '<p><a href="' + SB + '/articles">\u2190 \u8fd4\u56de\u8d44\u8baf\u5217\u8868</a></p></section>' + rH;
        var aJ = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: rc(a.title, cn), description: tr(aSummary, 160), datePublished: a.published_at ? String(a.published_at).slice(0, 10) : '', author: { '@type': 'Organization', name: '\u6c47\u667a\u4e91\u7801\u79d1\u6280' }, mainEntityOfPage: aCan }) + '</script>';
        fs2.writeFileSync(path.join(adir, a.id + '.html'), cityPage(sd, cn, 'articles/' + a.id, { title: aTitle, keywords: aKw, description: aDesc, body: aBody, jsonLd: aJ }));
        var as = mainIndex;
        as = as.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(aDesc) + '">');
        as = as.replace(/<meta name="keywords" content="[^"]*">/, '<meta name="keywords" content="' + esc(aKw) + '">');
        as = as.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + aCan + '">');
        as = as.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(rc(a.title, cn)) + ' | ' + cn + '\u6c47\u667a\u4e91\u7801\u79d1\u6280</title>');
        fs2.mkdirSync(path.join(cityDir, 'articles', String(a.id)), { recursive: true });
        fs2.writeFileSync(path.join(cityDir, 'articles', String(a.id), 'spa_index.html'), as);
        totalCount++;
      }

      // Rebuild case pages
      var cdir = path.join(cityDir, 'cases');
      fs2.rmSync(cdir, { recursive: true, force: true });
      fs2.mkdirSync(cdir, { recursive: true });

      for (var ci2 = 0; ci2 < cases.length; ci2++) {
        var cs = cases[ci2];
        var csTitle = rc(cs.title, cn) + '_' + cn + '_\u6c47\u667a\u4e91\u7801\u79d1\u6280';
        var csDescFull = rc(cs.description, cn);
        var csDesc = tr(csDescFull, 150);
        var csKw = (cs.title + ',\u5f00\u53d1\u6848\u4f8b') + ',' + cn + '\u5f00\u53d1\u6848\u4f8b';
        var csCan = SB + '/cases/' + cs.id;
        var csBody = '<nav class="breadcrumb" style="max-width:1200px;margin:0 auto;padding:16px 20px;font-size:14px;color:#6b7280;"><a href="' + SB + '/">\u9996\u9875</a> \u203a <a href="' + SB + '/cases">\u6848\u4f8b\u5217\u8868</a> \u203a ' + esc(rc(cs.title, cn)) + '</nav>'
          + '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + esc(rc(cs.title, cn)) + '</h1><p class="meta" style="color:#9ca3af;font-size:14px;">' + esc(cs.category) + ' \u00b7 ' + esc(cs.client || '') + '</p></section>'
          + '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">' + rc(cs.content || cs.description || '', cn) + '</div>'
          + '<p><a href="' + SB + '/cases">\u2190 \u8fd4\u56de\u6848\u4f8b\u5217\u8868</a></p></section>';
        fs2.writeFileSync(path.join(cdir, cs.id + '.html'), cityPage(sd, cn, 'cases/' + cs.id, { title: csTitle, keywords: csKw, description: csDesc, body: csBody, jsonLd: '' }));
        var css = mainIndex;
        css = css.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(csDesc) + '">');
        css = css.replace(/<meta name="keywords" content="[^"]*">/, '<meta name="keywords" content="' + esc(csKw) + '">');
        css = css.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + csCan + '">');
        css = css.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(rc(cs.title, cn)) + ' | ' + cn + '\u6c47\u667a\u4e91\u7801\u79d1\u6280</title>');
        fs2.mkdirSync(path.join(cityDir, 'cases', String(cs.id)), { recursive: true });
        fs2.writeFileSync(path.join(cityDir, 'cases', String(cs.id), 'spa_index.html'), css);
        totalCount++;
      }
      cityCount++;
    }
    if (pi % 5 === 0) console.log('Province ' + (pi + 1) + '/' + CITIES.provinces.length + ': ' + prov.name + ' (' + cityCount + ' cities done)');
  }
  console.log('Done! ' + totalCount + ' pages for ' + cityCount + ' cities');
  await pool.end();
}
main().catch(function(e) { console.error(e); process.exit(1); });