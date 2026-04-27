$webRoot = "C:\Users\ujjwa\Documents\New project\repo-sync\dist"
$url = "http://127.0.0.1:8787/index.html"

Write-Host "Starting ECHO HEIST local Web build..."
Write-Host "Root: $webRoot"
Write-Host "URL:  $url"

python -m http.server 8787 --bind 127.0.0.1 --directory "$webRoot"
