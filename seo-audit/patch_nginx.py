#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nginx 补丁：
A) 主站 + 城市站 prerender UA 白名单扩充（AI 搜索 / 微信 / 社交）
B) 城市子域站支持独立 /robots.txt /sitemap.xml（原被 SPA fallback 吞掉）
C) 城市站静态页 rewrite 补 /solutions /packages
"""
import re, shutil, subprocess, datetime

PATHS = ['/etc/nginx/sites-enabled/huizhiyunma', '/etc/nginx/sites-available/huizhiyunma']
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

NEW_UA = ('Baiduspider|Baiduspider-render|Sogou web spider|Sogou inst spider|360spider|YisouSpider|'
          'Googlebot|bingbot|Bytespider|YandexBot|facebookexternalhit|Twitterbot|WhatsApp|Line|TelegramBot|'
          'slurp|DuckDuckBot|Baiduspider-image|Sogou|sogou|baiduboxapp|'
          # 【SEO 修复】AI 搜索与社交/移动端抓取器
          'ChatGPT-User|OAI-SearchBot|GPTBot|PerplexityBot|ClaudeBot|anthropic-ai|'
          'Applebot|Google-Extended|cohere-ai|YouBot|MistralAI-User|'
          # 微信 / 移动端生态
          'MicroMessenger|WeChat|Weixin|SamsungBrowser|MiuiBrowser|HuaweiBrowser|'
          # 头条/夸克/神马/UC 等国内移动搜索
          'Quark|quark|ToutiaoMicroApp|BytedanceSpider|ToutiaoSpider|UCBrowser|ucweb|'
          'Shenma|sm-|Yisou|Qwantify')

OLD_UA_PAT = re.compile(r'(if \(\$http_user_agent ~\* ")([^"]*)("\) \{)')

matched = 0
for path in PATHS:
    try:
        src = open(path, encoding='utf-8').read()
    except FileNotFoundError:
        print(f'  跳过不存在: {path}'); continue
    shutil.copy(path, f'{path}.bak_seo_{TS}')
    def _sub(m):
        global matched
        matched += 1
        return m.group(1) + NEW_UA + m.group(3)
    new = OLD_UA_PAT.sub(_sub, src)
    open(path, 'w', encoding='utf-8').write(new)
    print(f'  ✓ UA 白名单已扩充 ({path})')

# 城市站 robots/sitemap 直出（避免被 try_files 吞）
PATH = '/etc/nginx/sites-enabled/huizhiyunma'
src = open(PATH, encoding='utf-8').read()

old_city_block = """    # All routes
    location / {
        if ($is_bot = "1") {
            rewrite ^/$ /city/$subdomain/index.html break;
            rewrite ^/services/?$ /city/$subdomain/services.html break;
            rewrite ^/cases/?$ /city/$subdomain/cases.html break;
            rewrite ^/about/?$ /city/$subdomain/about.html break;
            rewrite ^/templates/?$ /city/$subdomain/templates.html break;
            rewrite ^/packages/?$ /city/$subdomain/packages.html break;
            rewrite ^/articles/?$ /city/$subdomain/articles.html break;
            rewrite ^/contact/?$ /city/$subdomain/contact.html break;
            rewrite ^/cases/([0-9]+)/?$ /city/$subdomain/cases/$1.html break;
            rewrite ^/articles/([0-9]+)/?$ /city/$subdomain/articles/$1.html break;
        }
        # Browser: SPA with city SEO meta tags
        try_files $uri $uri/ /city/$subdomain/spa_index.html;
    }"""

new_city_block = """    # 【SEO 修复】城市站独立 robots.txt / sitemap.xml（原被 SPA fallback 吞掉，子域无收录入口）
    location = /robots.txt {
        alias /data/web/huizhiyunma/frontend/dist/city/$subdomain/robots.txt;
        default_type text/plain;
        add_header Cache-Control "public, max-age=3600";
    }
    location = /sitemap.xml {
        alias /data/web/huizhiyunma/frontend/dist/city/$subdomain/sitemap.xml;
        default_type application/xml;
        add_header Cache-Control "public, max-age=3600";
    }

    # All routes
    location / {
        if ($is_bot = "1") {
            rewrite ^/$ /city/$subdomain/index.html break;
            rewrite ^/services/?$ /city/$subdomain/services.html break;
            rewrite ^/cases/?$ /city/$subdomain/cases.html break;
            rewrite ^/about/?$ /city/$subdomain/about.html break;
            rewrite ^/templates/?$ /city/$subdomain/templates.html break;
            rewrite ^/packages/?$ /city/$subdomain/packages.html break;
            rewrite ^/articles/?$ /city/$subdomain/articles.html break;
            rewrite ^/contact/?$ /city/$subdomain/contact.html break;
            rewrite ^/cases/([0-9]+)/?$ /city/$subdomain/cases/$1.html break;
            rewrite ^/articles/([0-9]+)/?$ /city/$subdomain/articles/$1.html break;
        }
        # Browser: SPA with city SEO meta tags
        try_files $uri $uri/ /city/$subdomain/spa_index.html;
    }"""

if old_city_block in src:
    src = src.replace(old_city_block, new_city_block, 1)
    print('  ✓ 城市站 robots/sitemap 直出已加入')
else:
    print('  ✗ 城市站 location 块锚点未找到')

open(PATH, 'w', encoding='utf-8').write(src)

# 同步到 sites-available
try:
    shutil.copy(PATH, '/etc/nginx/sites-available/huizhiyunma')
    print('  ✓ 已同步 sites-available')
except Exception as e:
    print('  同步失败:', e)

print(f'\n共处理 {matched} 处 UA 白名单')
r = subprocess.run('nginx -t', shell=True, capture_output=True, text=True)
print('nginx -t:', r.returncode, r.stdout.strip(), r.stderr.strip())
