"""PRIME smoke tests. Install Playwright, then run: python tests/smoke.py.
By default, exercise the real local HTTP site. --inline is for environments
where a managed browser blocks local URLs; the same CSS/JS are inlined there.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread
from urllib.parse import urljoin
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WIDTHS = (320, 360, 390, 620, 768, 860, 1024, 1280, 1440, 1920)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--inline', action='store_true')
parser.add_argument('--report', type=Path)
args = parser.parse_args()

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
source = (ROOT / 'index.html').read_text(encoding='utf-8')
html = source.replace('<link rel="stylesheet" href="./style.css">', '<style>' + (ROOT / 'style.css').read_text(encoding='utf-8') + '</style>')
html = html.replace('<script src="./app.js" defer></script>', '')
script = (ROOT / 'app.js').read_text(encoding='utf-8')
report = {'browser_mode': 'inline-source' if args.inline else 'local-http', 'checks': []}

def check(label, condition):
    assert condition, label
    report['checks'].append(label)

def load(page, javascript=True):
    if args.inline:
        content = html.replace('</body>', '<script>' + script + '</script></body>') if javascript else html
        page.set_content(content, wait_until='load')
    else:
        page.goto(base, wait_until='networkidle')

def number(text):
    return int(''.join(c for c in text if c.isdecimal()))

try:
    # Confirm the real files can be served, independently of browser URL policies.
    for asset in ('index.html', 'style.css', 'app.js', 'favicon.svg', '.nojekyll'):
        with urlopen(urljoin(base, asset)) as response:
            check(f'HTTP asset {asset}', response.status == 200)
    # The same relative URLs resolve under the GitHub project path.
    for asset in ('./style.css', './app.js', './favicon.svg'):
        resolved = urljoin('https://example.github.io/Prime-Bot-Site/', asset)
        check(f'project path {asset}', resolved.endswith('/Prime-Bot-Site/' + asset[2:]))
    with sync_playwright() as p:
        executable = shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        report['browser'] = 'Chromium ' + browser.version
        errors = []
        page = browser.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 900})
            load(page)
            check(f'no horizontal overflow at {width}px', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        check('one h1 and Russian document language', page.locator('h1').count() == 1 and page.locator('html').get_attribute('lang') == 'ru')
        check('all fragment links resolve', page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].every(a=>document.getElementById(a.getAttribute('href').slice(1)))"))
        check('external links use noopener and noreferrer', page.evaluate("[...document.querySelectorAll('a[target=\"_blank\"]')].every(a=>a.rel.includes('noopener')&&a.rel.includes('noreferrer'))"))
        check('no API or credential forms', page.locator('form, input[type=password], input[type=email]').count() == 0)
        slider = page.locator('#price-floor')
        expected_competitors = {'normal': 1280, 'dump': 890, 'rise': 1590}
        for scenario, competitor in expected_competitors.items():
            page.locator(f'[data-scenario="{scenario}"]').click()
            for minimum in range(900, 1451, 50):
                slider.fill(str(minimum))
                expected = 1480 if competitor - 1 < minimum else competitor - 1
                actual = number(page.locator('#demo-price').inner_text())
                check(f'{scenario} minimum {minimum}: {expected}', actual == expected and actual >= minimum)
            check(f'only {scenario} is selected', page.locator('[data-scenario][aria-pressed=true]').count() == 1 and page.locator(f'[data-scenario="{scenario}"]').get_attribute('aria-pressed') == 'true')
        page.locator('[data-scenario="normal"]').focus()
        page.keyboard.press('Enter')
        slider.focus()
        page.keyboard.press('Home')
        check('range Home key', slider.input_value() == '900')
        page.keyboard.press('ArrowRight')
        check('range ArrowRight key', slider.input_value() == '950')
        page.keyboard.press('End')
        check('range End key and limit protection', slider.input_value() == '1450' and number(page.locator('#demo-price').inner_text()) == 1480)
        summary = page.locator('details').nth(1).locator('summary')
        summary.focus()
        page.keyboard.press('Enter')
        check('FAQ opens with keyboard', page.locator('details').nth(1).get_attribute('open') is not None)
        page.keyboard.press('Enter')
        check('FAQ closes with keyboard', page.locator('details').nth(1).get_attribute('open') is None)
        page.set_viewport_size({'width': 390, 'height': 844})
        menu = page.locator('.menu-toggle')
        menu.click()
        check('mobile menu opens', page.locator('#main-nav').is_visible() and menu.get_attribute('aria-expanded') == 'true')
        page.keyboard.press('Escape')
        check('Escape closes menu and restores focus', not page.locator('#main-nav').is_visible() and menu.evaluate('(e)=>e===document.activeElement'))
        menu.click()
        page.locator('#main-nav a').first.click()
        check('navigation closes mobile menu', menu.get_attribute('aria-expanded') == 'false')
        menu.click()
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.wait_for_timeout(100)
        page.set_viewport_size({'width': 390, 'height': 844})
        check('desktop resize clears mobile menu state', menu.get_attribute('aria-expanded') == 'false')
        check('no JavaScript runtime errors', not errors)
        page.close()
        reduced = browser.new_page(reduced_motion='reduce')
        load(reduced)
        check('reduced-motion disables smooth scrolling', reduced.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == 'auto')
        reduced.close()
        nojs = browser.new_page(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        load(nojs, javascript=False)
        check('no-JS content and navigation visible', nojs.locator('h1').is_visible() and nojs.locator('#main-nav').is_visible())
        check('no-JS controls honestly disabled', nojs.locator('#price-floor').is_disabled() and nojs.locator('[data-scenario]').first.is_disabled())
        check('no-JS FAQ remains readable', nojs.locator('details').first.locator('.faq-answer').is_visible())
        nojs.close()
        browser.close()
    report['passed'] = len(report['checks'])
    report['status'] = 'PASS'
finally:
    server.shutdown()
    server.server_close()
if args.report:
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
