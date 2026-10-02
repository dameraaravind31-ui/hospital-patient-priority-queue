# tests/run-e2e.ps1
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5997/")
$listener.Start()

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
    $chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

$browserProcess = Start-Process -FilePath $chrome -ArgumentList "--headless=new", "http://localhost:5997/tests/test-e2e.html" -PassThru

$receivedResult = $null

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    if ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/report-e2e-results") {
        $reader = New-Object System.IO.StreamReader($req.InputStream)
        $receivedResult = $reader.ReadToEnd()
        $res.StatusCode = 200
        $res.Close()
        break
    } else {
        $localPath = $req.Url.LocalPath.TrimStart('/').Replace('/', '\')
        if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = 'index.html' }
        $fullPath = Join-Path (Get-Location) $localPath

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $contentType = "text/plain"
            if ($mimeTypes.ContainsKey($ext)) { $contentType = $mimeTypes[$ext] }
            
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    }
}

$listener.Stop()
$listener.Close()
Stop-Process -Id $browserProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host "E2E_RESULT: $receivedResult"
