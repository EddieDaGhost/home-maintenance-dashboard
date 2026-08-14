# Deploying

You've done this before with the wedding site, so this will feel familiar. The
whole thing is about five minutes.

---

## 1. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Pick **`EddieDaGhost/home-maintenance-dashboard`** from the list and click
   **Import**.
3. Don't change any settings. Vercel detects Vite on its own:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Click **Deploy**, wait about a minute.

You get a URL like `home-maintenance-dashboard.vercel.app`. That URL works for
everything, including NFC tags — you don't need a custom domain to start.

**From here on, every push to `main` redeploys automatically.**

---

## 2. Test it

Open the URL on your phone and check:

- [ ] Seven colored area cards on the dashboard
- [ ] Tapping an area opens its task list
- [ ] Tapping **Log** turns the task green
- [ ] Reloading the page keeps the task green
- [ ] `your-url.vercel.app/#kitchen` opens straight to the Kitchen
- [ ] **Export to iPhone Calendar** downloads a file that Calendar will open

**Add it to your home screen** while you're there: Share → Add to Home Screen.
It then opens full-screen without the Safari bars.

---

## 3. Custom domain (optional)

You can skip this entirely and use the `.vercel.app` URL forever.

1. Buy the domain. `.app` domains run about $12–15/year — Cloudflare and Porkbun
   are cheap, and Vercel sells them directly if you'd rather keep it in one place.
2. In Vercel: **Project → Settings → Domains → Add**, enter the domain.
3. Vercel shows you the DNS records to create at your registrar. Add them.
4. Wait for DNS to propagate — usually under an hour, occasionally up to 48.

Heads up: **`.app` domains require HTTPS** (the whole TLD is on the browsers'
preload list). Vercel issues the certificate automatically, so this only matters
in the sense that `http://` links won't work. Write `https://` on your NFC tags.

**Write your NFC tags after the domain is live**, or you'll be rewriting seven
tags. If you tag before then, use the `.vercel.app` URL and know you'll redo them.

---

## 4. Making changes later

```bash
git pull                       # get the latest
# edit src/config/areas.js to change your rooms and chores
npm run dev                    # check it looks right
git add -A
git commit -m "Add garage area"
git push
```

Vercel picks up the push and redeploys in about a minute.

---

## Troubleshooting

**Build fails on Vercel but works locally.** Usually `package-lock.json` didn't
get committed. Check that it's in the repo.

**Blank white page after deploy.** Open the browser console. If it's a 404 on the
JS file, confirm the Output Directory is `dist` in Vercel's build settings.

**My logged tasks disappeared.** localStorage is per-browser and per-device.
Private/incognito windows get their own copy and throw it away when closed. The
history from your phone won't appear on your laptop — that's expected.

**NFC tag opens the dashboard instead of the area.** The hash is probably wrong
or capitalized. It must be exactly `#litter`, `#bathroom-1`, `#bathroom-2`,
`#bathroom-3`, `#kitchen`, `#laundry`, or `#chickens`.
