#!/usr/bin/env python3
"""PRIME functional browser checks. --inline for restricted browser environments.
Default checks the actual HTTP site; inline injects the exact CSS and JS bytes.
Requires Python Playwright + Chromium. No libraries are needed by the website.
"""
from pathlib import Path
from contextlib import contextmanager
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.request import urlopen
import argparse, base64, json, re, tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
RESULTS=[]
def check(name,condition,detail=''):
    RESULTS.append({'name':name,'passed':bool(condition),'detail':str(detail)})
    if not condition: print('FAIL:',name,detail)
def inlined():
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html)
    html=re.sub(r'<link[^>]*rel="icon"[^>]*>','',html)
    html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',html)
    html=html.replace('./assets/prime-mark.svg','data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/prime-mark.svg').read_bytes()).decode())
    css=(ROOT/'style.css').read_text()+(ROOT/'assets/workspace.css').read_text()
    return html.replace('</head>','<style>'+css+'</style></head>')
def load(page,inline,url,js=True):
    if inline:
        page.set_content(inlined(),wait_until='domcontentloaded')
        if js:
            for f in ['assets/prime-scene.js','assets/workspace.js','script.js']:
                page.add_script_tag(content=(ROOT/f).read_text())
    else: page.goto(url,wait_until='networkidle')
    page.wait_for_timeout(150)
def nav(page,view):page.locator('.mc-nav [data-view="'+view+'"]').click()
def overflow(page):return page.evaluate('document.documentElement.scrollWidth <= innerWidth')
def main_overflow(page):return page.locator('.mc-main').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
def price_dialog(page):page.locator('[data-action="price"]').click()
def enter_price(page,value):
    page.locator('#mc-price-input').fill(value)
    page.locator('#mc-price-form button[type=submit]').click()
def close_inner(page):page.locator('#workspace-dialog [data-modal-close]').first.click()
def save_state(page):
    # Test storage via a standards-compatible in-memory shim only in --inline
    # mode, where about:blank intentionally has no sessionStorage origin.
    return page.evaluate('window.__qaStorage || null')
@contextmanager
def serve():
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield 'http://127.0.0.1:'+str(server.server_port)+'/'
    finally:server.shutdown()
def run(args):
 with serve() as url:
  for f in ['index.html','style.css','assets/workspace.css','script.js','assets/workspace.js','assets/prime-scene.js','assets/prime-mark.svg','assets/favicon.svg','CNAME','.nojekyll']:
   response=urlopen(url+f);check('HTTP asset '+f,response.status==200 and response.read()==(ROOT/f).read_bytes())
  with sync_playwright() as p:
   launch={'headless':True,'args':['--no-sandbox']}
   if args.chromium:launch['executable_path']=args.chromium
   b=p.chromium.launch(**launch)
   page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce',accept_downloads=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   if args.inline:
    page.evaluate('''() => {window.__qaStorage={};Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>window.__qaStorage[k]||null,setItem:(k,v)=>{window.__qaStorage[k]=String(v)},removeItem:k=>delete window.__qaStorage[k]}})}''')
   load(page,args.inline,url)
   check('One H1 and Russian language',page.locator('h1').count()==1 and page.locator('html').get_attribute('lang')=='ru')
   check('Decorative microcopy removed',not any(x in page.locator('body').inner_text() for x in ['CS2 AUTOMATION','CONTROL IS YOUR','01 / MARKET','PRIME ENGINE']))
   check('No duplicate IDs',page.evaluate('''()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return a.length===new Set(a).size}'''))
   check('External links protected',page.locator('a[target="_blank"]:not([rel="noopener noreferrer"])').count()==0)
   widths=[320,360,375,390,430,640,768,820,900,1024,1100,1280,1440,1600,1920]
   for w in widths:
    page.set_viewport_size({'width':w,'height':900});page.wait_for_timeout(180)
    check('Landing overflow '+str(w),overflow(page))
    page.locator('.hero-actions [data-open-app]').click()
    bad=[]
    for view in ['overview','products','trades','analytics','settings']:
     nav(page,view)
     if not main_overflow(page):bad.append(view)
    check('All workspace layouts '+str(w),not bad,str(bad))
    check('Modal within viewport '+str(w),page.locator('#app-dialog').evaluate('e=>e.getBoundingClientRect().right<=innerWidth+1'))
    page.keyboard.press('Escape')
   page.set_viewport_size({'width':1440,'height':900});page.locator('.hero-actions [data-open-app]').click()
   check('CTA opens workspace',page.locator('#app-dialog').evaluate('e=>e.open'))
   check('Background scroll locked',page.locator('body').evaluate("e=>getComputedStyle(e).overflow==='hidden'"))
   page.locator('[data-action="info"]').click();check('Local boundary explained', 'Аккаунт' not in page.locator('#workspace-dialog').inner_text() and 'Нет входа в аккаунт' in page.locator('#workspace-dialog').inner_text());close_inner(page)
   nav(page,'products');page.locator('#mc-search').fill('Ice');check('Search filters items',page.locator('.mc-item').count()==1)
   page.locator('.mc-item').click();check('Item selection works','Ice Coaled' in page.locator('.mc-detail-heading').inner_text())
   page.locator('#mc-search').fill('no-such-skin');check('Search empty state',page.locator('.mc-empty').is_visible())
   page.locator('[data-action="clear"]').click();check('Clear search restores six items',page.locator('.mc-item').count()==6)
   page.locator('#mc-sort').select_option('low');vals=page.locator('.mc-item-copy>b').all_text_contents();check('Price sorting','220,82' in vals[0])
   page.locator('[data-select="001"]').click();price_dialog(page)
   for invalid in ['-1','abc','1e5','NaN','0','1000001','200.001','199.99']:
    enter_price(page,invalid);check('Reject price '+invalid,page.locator('#workspace-dialog').evaluate('e=>e.open') and bool(page.locator('#mc-price-error').inner_text()))
   enter_price(page,'250,50');check('Valid price changes item','250,50' in page.locator('.mc-item-stats').inner_text())
   check('Price modal closes',not page.locator('#workspace-dialog').evaluate('e=>e.open'))
   check('History contains two entries','2 записей' in page.locator('.mc-chart-caption').inner_text())
   check('Chart coordinates finite','NaN' not in page.locator('.mc-chart-line').get_attribute('points'))
   check('State appears in list','250,50' in page.locator('[data-select="001"]').inner_text())
   page.locator('[data-step="5"]').click();page.locator('[data-adjust="1"]').click();check('Quick step uses kopecks','250,55' in page.locator('.mc-item-stats').inner_text())
   page.locator('[data-action="floor"]').click();enter_price(page,'999');check('Floor cannot exceed price',bool(page.locator('#mc-price-error').inner_text()))
   enter_price(page,'250,55');page.locator('[data-adjust="-1"]').click();check('Quick step respects floor','250,55' in page.locator('.mc-item-stats').inner_text())
   price_dialog(page);enter_price(page,'250.55');check('Same value no extra history','3 записей' in page.locator('.mc-chart-caption').inner_text())
   page.locator('[data-item-toggle]').click();check('Item automatic price toggle',page.locator('[data-item-toggle]').get_attribute('aria-checked')=='false')
   nav(page,'analytics');page.locator('[data-analytics-tab="logs"]').click();check('Edits recorded in journal','250,50' in page.locator('.mc-log-panel').inner_text())
   page.locator('[data-analytics-tab="stats"]').click();check('Revenue derived from four sales','1 151,22' in page.locator('.mc-metrics').inner_text())
   page.locator('#mc-chart-metric').select_option('amount');check('Chart metric changes','441,64' in page.locator('.mc-operation-bars').inner_text())
   for days in [1,7,30]:
    page.locator('[data-period="'+str(days)+'"]').click();check('Analytics period '+str(days),page.locator('[data-period="'+str(days)+'"]').get_attribute('aria-pressed')=='true')
   nav(page,'trades');page.locator('[data-trade-type="purchase"]').click();check('Purchases honest empty state',page.locator('#mc-trade-table tbody tr').count()==0)
   page.locator('[data-trade-type="sale"]').click();page.locator('#mc-trade-search').fill('Ice');check('Trade search',page.locator('#mc-trade-table tbody tr').count()==2)
   with page.expect_download() as download:page.locator('[data-action="download"]').click()
   text=Path(download.value.path()).read_text(encoding='utf-8-sig');check('Filtered CSV contents',len(text.splitlines())==3 and 'Ice Coaled' in text)
   nav(page,'settings');page.locator('#mc-name').fill('<b>Risk</b>');page.locator('#mc-profile-form button').click();check('Profile text escaped',page.locator('.mc-profile strong').inner_text()=='<b>Risk</b>' and page.locator('.mc-profile strong b').count()==0)
   page.locator('[data-theme="light"]').click();check('Light theme works',page.locator('#market-app').get_attribute('data-theme')=='light')
   page.locator('#mc-interval').select_option('30');page.locator('[data-setting="notifications"]').click();check('Notifications disable preview',page.locator('[data-action="bell"]').is_disabled())
   page.locator('[data-setting="notifications"]').click();page.locator('[data-action="bell"]').click();check('Local notification', 'Предмет продан' in page.locator('.mc-toast').inner_text())
   page.keyboard.press('Escape');page.locator('#embed-slot #market-app').wait_for(state='attached');check('Escape returns workspace to page',page.locator('#embed-slot #market-app').count()==1 and not page.locator('body').evaluate("e=>getComputedStyle(e).overflow==='hidden'"))
   check('Focus restored to CTA',page.evaluate("document.activeElement.matches('.hero-actions [data-open-app]')"))
   check('State persists between embedded and modal','<b>Risk</b>' in page.locator('.mc-profile strong').inner_text())
   if args.inline:
    saved=save_state(page);load(page,args.inline,url);check('Restore via sessionStorage API shim',page.locator('.mc-profile strong').inner_text()=='<b>Risk</b>')
   else:
    page.reload();check('Session persistence after reload',page.locator('.mc-profile strong').inner_text()=='<b>Risk</b>')
   page.evaluate("PrimeWorkspace.navigate('products')");check('Price survived restore','250,55' in page.locator('.mc-item-stats').inner_text())
   page.locator('.hero-actions [data-open-app]').click();page.locator('[data-action="reset"]').click();page.locator('#workspace-dialog [data-modal-close]').first.click();check('Reset can be cancelled',page.locator('.mc-profile strong').inner_text()=='<b>Risk</b>')
   page.locator('[data-action="reset"]').click();page.locator('#mc-confirm-reset').click();check('Reset initial data',page.locator('.mc-profile strong').inner_text()=='Трейдер')
   nav(page,'products');check('Initial price restored','229,44' in page.locator('.mc-item-stats').inner_text())
   page.keyboard.press('Escape');page.locator('#feature-price').focus();page.keyboard.press('ArrowRight');check('Feature keyboard tabs',page.locator('#feature-analytics').get_attribute('aria-selected')=='true')
   page.locator('#feature-open').click();check('Feature opens correct app page',page.locator('#mc-heading').inner_text()=='Аналитика');page.keyboard.press('Escape')
   page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo(0,0)');page.locator('.menu-toggle').click();check('Mobile menu',page.locator('.menu-toggle').get_attribute('aria-expanded')=='true');page.keyboard.press('Escape');check('Menu Escape restores focus',page.evaluate("document.activeElement.matches('.menu-toggle')"))
   check('Reduced motion honored',page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"))
   check('No JavaScript errors',not errors,str(errors))
   # Separate contexts exercise degraded modes without modifying production files.
   bare=b.new_page(java_script_enabled=False,viewport={'width':390,'height':844});load(bare,args.inline,url,js=False)
   check('No JS: content and Telegram visible',bare.locator('h1').is_visible() and bare.locator('.app-fallback').count()==1 and overflow(bare));bare.close()
   canvaspage=b.new_page(viewport={'width':1440,'height':900});canvaspage.evaluate('HTMLCanvasElement.prototype.getContext=()=>null');load(canvaspage,args.inline,url)
   check('No Canvas: SVG fallback and app work',canvaspage.locator('.scene-fallback').evaluate("e=>getComputedStyle(e).opacity==='1'") and canvaspage.locator('.mc-main').count()==1);canvaspage.close()
   if args.inline:
    page.evaluate("window.__qaStorage['prime.workspace.v4']='bad-json'");load(page,True,url);check('Corrupt storage recovers',page.locator('.mc-profile strong').inner_text()=='Трейдер')
   motionpage=b.new_page(viewport={'width':1440,'height':900},reduced_motion='no-preference');load(motionpage,args.inline,url)
   initial=motionpage.locator('.object-scene').get_attribute('data-frames');motionpage.wait_for_timeout(240);later=motionpage.locator('.object-scene').get_attribute('data-frames');check('3D frames advance',int(later)>int(initial))
   motionpage.locator('.motion-control').click();motionpage.wait_for_timeout(60);n=motionpage.locator('.object-scene').get_attribute('data-frames');motionpage.wait_for_timeout(240);check('3D pauses',motionpage.locator('.object-scene').get_attribute('data-frames')==n)
   motionpage.locator('.motion-control').click();motionpage.locator('.hero-actions [data-open-app]').click();motionpage.wait_for_timeout(90);n=motionpage.locator('.object-scene').get_attribute('data-frames');motionpage.wait_for_timeout(240);check('3D stops behind application',motionpage.locator('.object-scene').get_attribute('data-frames')==n)
   motionpage.keyboard.press('Escape');motionpage.locator('#embed-slot #market-app').wait_for(state='attached');motionpage.evaluate("window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})");motionpage.wait_for_timeout(250);n=motionpage.locator('.object-scene').get_attribute('data-frames');motionpage.wait_for_timeout(240);check('3D stops outside viewport',motionpage.locator('.object-scene').get_attribute('data-frames')==n)
   motionpage.close();b.close()
 report={'mode':'inline-with-storage-shim' if args.inline else 'HTTP','checks':RESULTS,'passed':sum(x['passed'] for x in RESULTS),'total':len(RESULTS),'limitations':['External browser navigation blocked in this environment. Inline run is not live-domain QA.','Inline storage persistence uses a sessionStorage API shim.','Not tested on physical devices, Safari or Firefox.'] if args.inline else []}
 Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(str(report['passed'])+'/'+str(report['total'])+' passed');return 0 if report['passed']==report['total'] else 1
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--inline',action='store_true');parser.add_argument('--chromium');parser.add_argument('--report',default='test-report.json');args=parser.parse_args();raise SystemExit(run(args))
