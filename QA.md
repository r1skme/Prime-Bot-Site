# Flow 6 verification

128/128 automated checks passed in Chromium using the exact production CSS and JavaScript embedded as local data URLs. Results are in the accompanying source archive's `QA-results.json`; the executable check is `tests/verify.py` in that archive.

Checked: widths 360, 390, 768, 1440, 2560; all six pages; actual change of SVG path geometry over time; absence of Canvas; separated strands; Telegram hover and stable label; mobile menu and Escape; native FAQ expansion; text search; comparison toggle; all local links and anchors; reduced motion; no JavaScript; DPR 2; hidden loader after readiness; resource-error recovery.

Loader testing used delayed local insertion of the actual stylesheet/script, followed by their actual load events. It verified a visible pending state, the change from stylesheet to script, and immediate release when settled. Failure callbacks were simulated deliberately. This is not a live slow-network measurement.

HTTP navigation in the container's Chromium was denied by its administrator (`ERR_BLOCKED_BY_ADMINISTRATOR`), so rendering used `set_content` and embedded assets rather than bypassing that restriction. The public domain also returned HTTP 502 to the web reader before publication. Neither issue is evidence of a fault on the user's device. Production publishing must be checked separately through GitHub Actions.

Screenshots of desktop, mobile, product cards, plans and pending-resource loader were inspected. No benchmark guarantee for the user's GPU, refresh rate or browser is made.
