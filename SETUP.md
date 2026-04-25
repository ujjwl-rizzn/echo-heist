# ECHO HEIST — Setup Guide

## What's in this zip
This is the rebuilt ECHO HEIST project. Keep using the validation commands below after every change so fixes stay verified instead of assumed.

---

## Step 1 — Open your repo folder
Go to:  C:\Users\ujjwa\Documents\New project\repo-sync

---

## Step 2 — Delete these old broken files/folders
(they were from the previous version and will break the build if left in)

Delete these if they exist:
  src\game\scenes\HeistSceneBase.ts
  src\game\entities\          (whole folder)
  src\game\systems\           (whole folder)

---

## Step 3 — Copy new files in
Copy EVERYTHING from this extracted zip into your repo-sync folder.
Say YES to overwrite when asked.

---

## Step 4 — Open PowerShell in your repo folder
Right-click inside the repo-sync folder → "Open in Terminal"

Run these commands ONE AT A TIME:

  npm.cmd install
  npm.cmd run validate:levels
  npm.cmd run smoke:viewport
  npm.cmd run build
  npm.cmd run dev

If all pass:
- validate:levels prints "All 8 levels validated"
- smoke:viewport prints "All viewport contracts passed"
- build prints "built in Xms"
- dev prints a local URL like http://localhost:5173

Open that URL in your browser and test the game.

---

## Step 5 — Push to GitHub
In PowerShell:

  git add -A
  git commit -m "improve mobile fullscreen and viewport polish"
  git push

Vercel picks it up automatically and redeploys in ~2 minutes.

---

## Step 6 — To earn real money from ads (when ready)

1. Sign up at adsense.google.com and get approved
2. Create a Rewarded ad unit in Google Ad Manager
3. In Vercel → your project → Settings → Environment Variables, add:
     VITE_REWARDED_AD_PROVIDER   =  google-gpt
     VITE_GAM_REWARDED_AD_UNIT_PATH  =  /your-code/your-unit
4. Redeploy. Done.

Right now the game runs in demo mode which costs nothing and earns nothing.
The buttons all work — they just simulate the ad break instead of showing a real one.

---

## Promoting the game (get players first)
- Post to r/WebGames and r/IndieGaming on Reddit
- Upload to itch.io (free listing, just set price to free)
- Post a short gameplay clip to X/Twitter or TikTok
- List on Newgrounds
- Tell people what makes it different: the Time Echo mechanic

