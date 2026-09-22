"""PRIME checks. Python + Playwright required for checks only, not for the site.
python tests/smoke.py --inline --report report.json --screenshots /tmp/prime-shots
Default mode tests actual local HTTP; --inline is for restricted browser environments.
"""
from __future__ import annotations
import argparse,base64,functools,http.server,json,re,shutil,threading,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--inline',action='store_true');ap.add_argument('--report',default='report.json');ap.add_argument('--screenshots');args=ap.parse_args()
    results=[];errors=[];shots=Path(args.screenshots) if args.screenshots else None
    if shots:shots.mkdir(parents=True,exist_ok=True)
    def check(name,ok):
        results.append({'name':name,'passed':bool(ok)});print(('PASS' if ok else 'FAIL'),name,flush=True)
    source=(ROOT/'index.html').read_text();css=(ROOT/'style.css').read_text()
    inline=source.replace('<link rel="stylesheet" href="./style.css">','<style>'+css+'</style>')
    inline=re.sub(r'<script[^>]*src="[^\"]+"[^>]*></script>','',inline)
    inline=re.sub(r'(src|href)="\./(assets/[^\"]+\.svg)"',lambda m:m[1]+'="data:image/svg+xml;base64,'+base64.b64encode((ROOT/m[2]).read_bytes()).decode()+'"',inline)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
    for f in ('index.html','style.css','script.js','assets/prime-scene.js','assets/prime-mark.svg','assets/favicon.svg','CNAME','.nojekyll'):
        with urllib.request.urlopen(base+f,timeout=5) as r:check('HTTP asset '+f,r.status==200 and r.read()==(ROOT/f).read_bytes())
    with sync_playwright() as pw:
        exe=shutil.which('chromium')
        if Path('/usr/lib/chromium/chromium').exists():exe='/usr/lib/chromium/chromium'
        b=pw.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox'])
        def load(page,js=True,canvas=True):
            page.on('pageerror',lambda e:errors.append(str(e)))
            if args.inline:
                page.set_content(inline,wait_until='domcontentloaded')
                if not canvas:page.evaluate('HTMLCanvasElement.prototype.getContext=()=>null')
                if js:
                    for f in ('assets/prime-scene.js','script.js'):page.add_script_tag(content=(ROOT/f).read_text())
            else:
                if not canvas:page.add_init_script('HTMLCanvasElement.prototype.getContext=()=>null')
                page.goto(base,wait_until='networkidle')
            page.wait_for_timeout(180)
        page=b.new_page(viewport={'width':1440,'height':900});load(page)
        check('One h1, five main sections, Russian language',page.locator('h1').count()==1 and page.locator('main > section').count()==5 and page.locator('html').get_attribute('lang')=='ru')
        check('Every section anchor exists',page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].every(a=>document.getElementById(a.hash.slice(1)))"))
        check('External links have safe attributes',page.evaluate("[...document.querySelectorAll('a[target=\"_blank\"]')].every(a=>a.rel.includes('noopener')&&a.rel.includes('noreferrer'))"))
        check('No provisional labels on public page',not re.search(r'демо|тестов|макет|в разработке|вымышлен|концепт|lorem',page.locator('body').inner_text(),re.I))
        check('No credential, payment or personal information fields',page.locator('input,textarea').count()==0)
        check('All runtime assets relative, no CDN',not re.search(r'(?:src|href)="https?://[^\"]+\.(?:js|css|woff2?|png|jpg|webp)',source))
        check('Existing CNAME preserved',(ROOT/'CNAME').read_text().strip()=='www.primemarket.skin')
        check('3D geometry rendered',page.locator('.hero-scene').evaluate('e=>e.classList.contains("scene-ready")'))
        frames=lambda:page.locator('.hero-scene').get_attribute('data-frames')
        a=frames();page.wait_for_timeout(180);check('3D animates',a!=frames())
        page.locator('.motion-button').click();page.wait_for_timeout(80);a=frames();page.wait_for_timeout(180)
        check('Pause stops 3D and exposes pressed state',a==frames() and page.locator('.motion-button').get_attribute('aria-pressed')=='true')
        page.locator('.motion-button').click();page.wait_for_timeout(100);a=frames();page.wait_for_timeout(180);check('Resume restarts 3D',a!=frames())
        page.evaluate('scrollTo({top:160,behavior:"instant"})');page.wait_for_timeout(120)
        check('Scroll changes hero scene transform',page.locator('.hero-scene').evaluate('e=>getComputedStyle(e).transform')!='none')
        page.evaluate('document.querySelector("#engine").scrollIntoView({behavior:"instant"})');page.wait_for_timeout(150);a=frames();page.wait_for_timeout(180);check('Offscreen hero stops rendering',a==frames())
        page.locator('.signal-button').click();page.wait_for_timeout(900);check('Signal enters rules step',page.locator('#engine').get_attribute('data-step')=='2')
        page.wait_for_timeout(900);check('Signal reaches notification step',page.locator('#engine').get_attribute('data-step')=='3')
        page.wait_for_timeout(1300);check('Signal control resets after sequence',page.locator('#engine').get_attribute('data-step')=='0' and page.locator('.signal-button').is_enabled())
        page.locator('#tab-limits').click();check('Control tab activates shield',page.locator('#panel-limits').is_visible() and not page.locator('#panel-price').is_visible())
        page.keyboard.press('ArrowDown');check('Arrow selects next tab',page.locator('#tab-events').get_attribute('aria-selected')=='true')
        page.keyboard.press('Home');check('Home selects first tab',page.locator('#tab-price').get_attribute('aria-selected')=='true')
        page.keyboard.press('End');check('End selects last tab',page.locator('#tab-events').get_attribute('aria-selected')=='true')
        check('Exactly one active tab and panel',page.locator('.feature-tab[aria-selected="true"]').count()==1 and page.locator('.feature-panel:visible').count()==1)
        page.locator('.expand-button').click();check('Native dialog opens',page.locator('dialog').evaluate('e=>e.open'))
        check('Modal moves app without duplicate IDs',page.locator('.dialog-content #app-window').count()==1 and page.evaluate('new Set([...document.querySelectorAll("[id]")].map(e=>e.id)).size===document.querySelectorAll("[id]").length'))
        page.keyboard.press('Tab');check('Native dialog contains focus',page.evaluate('!!document.activeElement.closest("dialog")'))
        page.keyboard.press('Escape');page.wait_for_timeout(100);check('Escape restores app and focus',page.locator('.product-stage #app-window').count()==1 and page.locator('.expand-button').evaluate('e=>e===document.activeElement'))
        page.locator('.expand-button').click();page.locator('.close-dialog').click();page.wait_for_timeout(80);check('Dialog close unlocks page',not page.locator('body').evaluate('e=>e.classList.contains("modal-open")'))
        page.locator('.motion-button').click()
        for width in (1920,1600,1440,1280,1024,960,768,701,700,620,430,390,375,360,320):
            page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(70)
            check(f'No horizontal overflow {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check(f'Hero heading fits {width}px',page.locator('h1').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(80)
        check('Mobile tablist is horizontal',page.locator('.feature-tabs').get_attribute('aria-orientation')=='horizontal')
        page.locator('.menu-button').click();check('Mobile menu opens and focuses link',page.locator('.navigation').is_visible() and page.evaluate('!!document.activeElement.closest(".navigation")'))
        page.keyboard.press('Escape');check('Menu Escape returns focus',page.locator('.menu-button').get_attribute('aria-expanded')=='false' and page.locator('.menu-button').evaluate('e=>e===document.activeElement'))
        page.locator('.menu-button').click();page.locator('.navigation a').first.click();check('Menu closes on link',page.locator('.menu-button').get_attribute('aria-expanded')=='false')
        page.locator('.menu-button').click();page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(80);check('Desktop resets mobile menu',page.locator('.menu-button').get_attribute('aria-expanded')=='false')
        reduced=b.new_context(reduced_motion='reduce',viewport={'width':390,'height':844});rp=reduced.new_page();load(rp)
        check('Reduced motion pauses renderer and smooth scroll',rp.locator('.motion-button').get_attribute('aria-pressed')=='true' and rp.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto')
        rf=rp.locator('.hero-scene').get_attribute('data-frames');rp.wait_for_timeout(180);check('Reduced motion static frame',rf==rp.locator('.hero-scene').get_attribute('data-frames'))
        nojs=b.new_context(java_script_enabled=False,viewport={'width':390,'height':844});np=nojs.new_page();load(np,js=False)
        check('No JS: text, navigation and vector remain',np.locator('h1').is_visible() and np.locator('.navigation a').first.is_visible() and np.locator('.hero-scene .scene-fallback').is_visible())
        check('No JS: all three feature panels readable',np.locator('.feature-panel:visible').count()==3)
        check('No JS: no dead controls displayed',np.locator('.menu-button:visible,.motion-button:visible,.expand-button:visible,.feature-tab:visible,.signal-button:visible').count()==0)
        check('No JS: no horizontal overflow',np.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        fallback=b.new_page(viewport={'width':390,'height':844});load(fallback,canvas=False)
        check('Canvas failure preserves visual fallback and controls',fallback.locator('.hero-scene .scene-fallback').is_visible() and fallback.locator('.motion-button').is_visible())
        check('No JavaScript errors',not errors)
        if shots:
            page.locator('#tab-price').click()
            for w,h in [(1920,1080),(1440,900),(390,844)]:
                page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(160)
                page.screenshot(path=str(shots/f'{w}-first.png'));page.screenshot(path=str(shots/f'{w}-full.png'),full_page=True)
            page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(90)
            for name in ['top','center','engine','control','telegram-section','finale']:
                page.locator('#'+name).scroll_into_view_if_needed();page.wait_for_timeout(80);page.locator('#'+name).screenshot(path=str(shots/f'block-{name}.png'))
            for tab in ['limits','events']:
                page.locator('#tab-'+tab).click();page.locator('#control').screenshot(path=str(shots/f'feature-{tab}.png'))
        report={'browser':b.version,'mode':'inline source + separate HTTP assets' if args.inline else 'HTTP','checks':results,'passed':sum(x['passed'] for x in results),'total':len(results),'errors':errors,'notes':['Browser policy blocks navigation to localhost in the authoring environment.','No market requests, trade execution or delivery of real Telegram notifications tested.','Firefox, Safari, real phones and live DNS are outside this run.']}
        Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2));b.close()
    server.shutdown()
    print(f"{report['passed']}/{report['total']}")
    if report['passed']!=report['total']:raise SystemExit(1)
if __name__=='__main__':main()
