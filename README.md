# 🌐 M-IOS v26

Phone-friendly GitHub deployment. Just 2 files needed.

## Setup (All on Your Phone)

1. Go to **github.com** on your phone browser
2. Create a **new repository** (name it `Bude-Tech` or anything)
3. Tap **Add file** → **Create new file**
4. Name it `.github/workflows/deploy.yml`
5. Copy-paste the workflow code above
6. Tap **Commit new file**
7. Create another file: `README.md`
8. Copy-paste this README
9. Tap **Commit new file**

## Run It

1. Go to **Actions** tab in your repo
2. Tap the workflow run
3. Tap **Re-run jobs** or wait for auto-run on push

## Add LLM API Key (Optional)

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Tap **New repository secret**
3. Name: `LLM_API_KEY`
4. Value: your OpenAI API key
5. Tap **Add secret**

## View Dashboard

The workflow outputs a URL. Or use GitHub Codespaces:

1. Go to your repo
2. Tap the **`.`** key on your keyboard (opens web editor)
3. Go to **Terminal** → **New Terminal**
4. Run: `cd backend && node server.js`
5. Open the forwarded port URL

## What It Does

- Autonomous decision loop every 30 seconds
- Live SSE streaming to dashboard
- Decision logs auto-generated
- Works with or without LLM API key
