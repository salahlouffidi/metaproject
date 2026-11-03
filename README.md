# PHISHGUARD AI — LOUFFI Edition

A browser extension that helps people inspect links before trusting them. Click **Analyze page** to collect HTTP(S) links from the current tab and review URL risk signals with optional Meta AI explanations.

Built by [Salah Eddine Louffidi](https://github.com/salahlouffidi) for the Meta Global AI Developer Hackathon.

## Prototype status

| Component | Status |
| --- | --- |
| Chrome / Edge Manifest V3 extension | Implemented |
| Local URL heuristic engine | Implemented |
| Meta API adapter | Implemented; live credentials and model access required |
| TypeSafe Jev adapter | Experimental scaffold; request and response schema must be verified |
| Threat reputation feeds, redirect resolution | Not implemented |

This repository is a development MVP. API success and phishing detection accuracy have not been validated end to end. Low risk does not mean a destination is safe.

## How it works

1. On your click, the extension collects up to 40 unique HTTP(S) links from the rendered page DOM.
2. A local Node.js server scores URL structure: embedded credentials, IP hosts, brand terms, and other indicators.
3. When configured, Meta receives up to 15 candidate URLs with their heuristic evidence and returns explanations.
4. The popup presents results and configuration warnings. No candidate destination is fetched or opened.

The collector can include hidden anchors in the DOM and does not scroll the feed, resolve Facebook redirect wrappers, or access unloaded posts. Jev results are returned by the backend when configured; the current popup uses Meta or heuristic results.

## Quick start

Requires Node.js 20 or later, npm, and Chrome or Edge.

```bash
git clone https://github.com/salahlouffidi/metaproject.git
cd metaproject/server
npm install
```

Create the local configuration:

```powershell
# Windows
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Edit `server/.env` and set `MODEL_API_KEY` for Meta. The model identifier defaults to `muse-spark-1.3`; confirm availability in your Meta account. Leave Jev unset until its official transport is verified. Without keys the server runs heuristic analysis only.

```bash
npm start
```

Check `http://localhost:8787/health`. Then open `chrome://extensions` (or `edge://extensions`), enable Developer mode, choose **Load unpacked**, and select this repository’s `extension` directory. Open a normal website and click **Analyze page** in the extension popup.

## Privacy and security

- Credentials stay in `server/.env`; never put them in the extension or commit them.
- URLs may contain personal identifiers or tokens. Review page content before analysis: configured AI providers receive candidate URLs and evidence.
- The server binds to loopback. Keep it local; authentication, rate limiting, and production deployment hardening are not included.
- Heuristics can produce false positives and miss real threats. The MVP has no reputation database or destination-content inspection.
- Only the current page’s rendered anchors are collected, on user action.

See [SECURITY.md](SECURITY.md) for reporting security issues and [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## Repository layout

- `extension/` — browser manifest, popup, and link collector
- `server/src/` — local API, URL signals, Meta adapter, and experimental Jev adapter
- `server/.env.example` — configuration names without credentials

## Validation

JavaScript syntax and deterministic URL signal tests run in GitHub Actions. Live API and browser testing require local configuration and are not represented by these checks.

## License

[MIT](LICENSE)
