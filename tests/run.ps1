# tests/run.ps1
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5999/")
$listener.Start()

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
    $chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

$process = Start-Process -FilePath $chrome -ArgumentList "--headless=new", "http://localhost:5999/tests/test-runner.html" -PassThru

$receivedResult = $null
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    if ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/report-results") {
        $reader = New-Object System.IO.StreamReader($req.InputStream)
        $receivedResult = $reader.ReadToEnd()
        $res.StatusCode = 200
        $res.Close()
        break
    } else {
        $localPath = $req.Url.LocalPath.TrimStart('/').Replace('/', '\')
        $fullPath = Join-Path (Get-Location) $localPath
        Write-Host "REQ: $($req.Url.LocalPath) -> $fullPath (Exists: $(Test-Path $fullPath))"
        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $res.ContentLength64 = $bytes.Length
            if ($localPath.EndsWith(".html")) { $res.ContentType = "text/html" }
            elseif ($localPath.EndsWith(".js")) { $res.ContentType = "application/javascript" }
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    }
}

$listener.Stop()
$listener.Close()
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Write-Host "TEST_OUT: $receivedResult"
