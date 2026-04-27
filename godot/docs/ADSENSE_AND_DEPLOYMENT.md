# AdSense And Deployment Notes

These values must stay protected when the Godot build is deployed through the original Vercel site.

## Original Vercel Site

https://echo-heist-jet.vercel.app

## Google AdSense Account Meta

```html
<meta name="google-adsense-account" content="ca-pub-6967018953057648">
```

## Rule

Do not remove this metadata from the live Vercel HTML shell. If the Godot Web export replaces the old Vite page, add the AdSense meta tag into the exported `index.html` before deploying.

## itch.io

itch.io can host the Godot Web ZIP separately, but the AdSense-approved Vercel site should remain available as the canonical web site and landing page.
