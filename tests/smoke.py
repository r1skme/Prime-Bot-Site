"""python tests/smoke.py --inline --report report.json
Install: python -m pip install playwright; python -m playwright install chromium
Default: real local HTTP. --inline: same source in memory for restricted browsers.
"""
from __future__ import annotations
import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import shutil
import threading
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--inline', action='store_true')
    parser.add_argument('--report', default='report.json')
    args = parser.parse_args()
    results = []
    def check(name: str, ok: bool) -> None:
        results.append({'name': name, 'passed': bool(ok)})
        print(('PASS' if ok else 'FAIL'), name)
    html = (ROOT / 'index.html').read_text()
    css = (ROOT / 'style.css').read_text()
    js = (ROOT / 'app.js').read_text()
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    for name in ('index.html', 'style.css', 'app.js', 'favicon.svg', '.nojekyll'):
        with urllib.request.urlopen(base + name, timeout=5) as response:
            check('HTTP asset: ' + name, response.status == 200 and response.read() == (ROOT / name).read_bytes())
    check('Relative assets for GitHub Pages project paths', all(x.startswith('./') for x in re.findall(r'(?:src|href)="([^"]+\.(?:css|js|svg))"', html)))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox'])
        errors = []
        def load(page, script: bool = True):
            page.on('pageerror', lambda e: errors.append(str(e)))
            if args.inline:
                source = html.replace('<link rel="stylesheet" href="./style.css">', '<style>'+css+'</style>').replace('<script src="./app.js" defer></script>', '')
                page.set_content(source, wait_until='domcontentloaded')
                if script: page.add_script_tag(content=js)
            else:
                page.goto(base, wait_until='networkidle')
        page = browser.new_page(viewport={'width':1440,'height':1000})
        load(page)
        page.wait_for_timeout(250)
        check('One h1 and Russian document', page.locator('h1').count()==1 and page.locator('html').get_attribute('lang')=='ru')
        check('No provisional labels', not re.search(r'демо|тестов|симуляц|в разработке|вымышлен|концепци', page.locator('body').inner_text(), re.I))
        check('Every anchor resolves', page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].every(a=>!!document.getElementById(a.hash.slice(1)))"))
        check('External links secured', page.evaluate("[...document.querySelectorAll('a[target=\"_blank\"]')].every(a=>a.rel.includes('noopener')&&a.rel.includes('noreferrer'))"))
        check('No secret/payment fields', page.locator('input,textarea').count()==0)
        check('3D mesh rendered', page.locator('.hero-art').evaluate("el=>el.classList.contains('scene-ready')"))
        canvas = lambda: page.locator('canvas').evaluate('el=>el.toDataURL()')
        a=canvas();page.wait_for_timeout(180);check('Scene animates', canvas()!=a)
        page.locator('.motion-button').click();page.wait_for_timeout(50)
        a=canvas();page.wait_for_timeout(180);check('Motion toggle stops rendering', canvas()==a and page.locator('.motion-button').get_attribute('aria-pressed')=='true')
        page.locator('.motion-button').click();page.wait_for_timeout(70)
        a=canvas();page.wait_for_timeout(180);check('Motion toggle resumes rendering',canvas()!=a)
        for width in (320,360,375,390,430,620,700,701,768,900,1024,1280,1440,1920):
            page.set_viewport_size({'width':width,'height':960})
            page.wait_for_timeout(80)
            check(f'No horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.set_viewport_size({'width':390,'height':844})
        page.locator('.menu-button').click()
        check('Mobile navigation opens and focuses link',page.locator('.navigation').is_visible() and page.evaluate('document.activeElement.closest(".navigation")!==null'))
        page.keyboard.press('Escape')
        check('Menu Escape restores focus',page.locator('.menu-button').get_attribute('aria-expanded')=='false' and page.locator('.menu-button').evaluate('el=>el===document.activeElement'))
        page.locator('.menu-button').click();page.locator('.navigation a').first.click()
        check('Menu closes after navigation',page.locator('.menu-button').get_attribute('aria-expanded')=='false')
        page.locator('.menu-button').click();page.set_viewport_size({'width':1440,'height':1000});page.wait_for_timeout(80)
        check('Desktop resets menu',page.locator('.menu-button').get_attribute('aria-expanded')=='false')
        page.locator('.expand-button').click()
        check('Interface opens in dialog',page.locator('dialog').evaluate('el=>el.open') and page.locator('.dialog-content .app-window').count()==1)
        check('Modal has unique IDs',page.evaluate("new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size===document.querySelectorAll('[id]').length"))
        page.keyboard.press('Tab');page.keyboard.press('Tab')
        check('Modal traps keyboard focus',page.evaluate('!!document.activeElement.closest("dialog")'))
        page.keyboard.press('Escape')
        page.wait_for_function("!document.querySelector('dialog').open && !document.body.classList.contains('modal-open')")
        check('Modal Escape restores focus and clears clone',not page.locator('dialog').evaluate('el=>el.open') and page.locator('.expand-button').evaluate('el=>el===document.activeElement') and page.locator('.dialog-content').inner_text()=='')
        page.locator('.expand-button').click();page.locator('.close-dialog').click()
        page.wait_for_function("!document.body.classList.contains('modal-open')")
        check('Modal close button unlocks page',not page.locator('body').evaluate('el=>el.classList.contains("modal-open")'))
        # Stop canvas work outside the viewport.
        page.evaluate('document.querySelector("#start").scrollIntoView({behavior:"instant"})');page.wait_for_timeout(150)
        a=canvas();page.wait_for_timeout(150);check('Offscreen scene stops rendering',canvas()==a)
        reduced_context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
        reduced_page=reduced_context.new_page();load(reduced_page)
        check('Reduced motion disables scrolling animation',reduced_page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto')
        check('Reduced motion pauses scene',reduced_page.locator('.motion-button').get_attribute('aria-pressed')=='true')
        nojs_context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
        nojs_page=nojs_context.new_page();load(nojs_page,False)
        check('No JS: text and navigation remain visible',nojs_page.locator('h1').is_visible() and nojs_page.locator('.navigation a').first.is_visible())
        check('No JS: no inert controls shown',not nojs_page.locator('.motion-button').is_visible() and not nojs_page.locator('.expand-button').is_visible() and not nojs_page.locator('.menu-button').is_visible())
        check('No JS: decorative fallback visible',nojs_page.locator('.art-fallback').is_visible())
        if args.inline:
            fallback=browser.new_page(viewport={'width':390,'height':844})
            load(fallback,False)
            fallback.evaluate('HTMLCanvasElement.prototype.getContext=()=>null')
            fallback.add_script_tag(content=js)
            check('Canvas unavailable: graceful 3D-styled fallback',fallback.locator('.art-fallback').is_visible() and not fallback.locator('.hero-art').evaluate('el=>el.classList.contains("scene-ready")'))
        check('No JavaScript runtime errors',not errors)
        output={'browser':browser.version,'mode':'inline + separate HTTP assets' if args.inline else 'HTTP','checks':results,'passed':sum(x['passed'] for x in results),'total':len(results),'errors':errors}
        Path(args.report).write_text(json.dumps(output,ensure_ascii=False,indent=2))
        browser.close()
    server.shutdown()
    assert all(r['passed'] for r in results), 'Some checks failed; see report.'

if __name__=='__main__': main()
