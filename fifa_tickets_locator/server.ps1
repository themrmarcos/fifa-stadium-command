$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
} catch {
    # If port 8000 is occupied, try 8080
    $port = 8080
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "Local deployment backend server started at http://localhost:$port/"
$folder = "C:\Users\hp\.gemini\antigravity\scratch\fifa_tickets_locator"
$publicFolder = Join-Path $folder "public"
$dbPath = Join-Path $folder "data\db.json"
$kbPath = Join-Path $folder "data\stadium_knowledge.json"

function Get-RelevantContext {
    param (
        [string]$query
    )
    try {
        $localKbPath = "C:\Users\hp\.gemini\antigravity\scratch\fifa_tickets_locator\data\stadium_knowledge.json"
        if (-not (Test-Path $localKbPath)) { 
            Write-Host "KB path not found: $localKbPath"
            return @() 
        }
        
        $kb = Get-Content -Raw -Path $localKbPath -Encoding utf8 | ConvertFrom-Json
        
        $cleanQuery = $query.ToLower().Replace("?", "").Replace(".", "").Replace(",", "")
        $tokens = $cleanQuery.Split(" ")
        
        $stopWords = @("what", "is", "where", "the", "can", "i", "a", "of", "to", "in", "on", "at", "for", "with", "how", "do", "you")
        $filteredTokens = $tokens | Where-Object { $_ -and -not ($stopWords -contains $_) }
        
        if ($null -eq $filteredTokens -or $filteredTokens.Count -eq 0) { $filteredTokens = $tokens }
        
        $scoredChunks = @()
        
        foreach ($chunk in $kb) {
            $score = 0
            foreach ($kw in $chunk.keywords) {
                foreach ($tok in $filteredTokens) {
                    if ($tok.Trim() -eq $kw.Trim()) {
                        $score += 2.0
                    }
                }
            }
            foreach ($tok in $filteredTokens) {
                if ($chunk.content.ToLower().Contains($tok)) {
                    $score += 0.5
                }
            }
            
            if ($score -gt 0) {
                $scoredChunks += [PSCustomObject]@{
                    chunk = $chunk
                    score = $score
                }
            }
        }
        
        $sorted = @($scoredChunks | Sort-Object score -Descending)
        $retrieved = @()
        if ($null -ne $sorted -and $sorted.Count -gt 0) {
            $limit = [Math]::Min($sorted.Count, 2)
            for ($i = 0; $i -lt $limit; $i++) {
                $retrieved += $sorted[$i].chunk
            }
        }
        return $retrieved
    } catch {
        Write-Host "Error in Get-RelevantContext: $_"
        return @()
    }
}

# Open browser automatically
# Start-Process "http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        
        # Add CORS Headers for local development
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        # Add HTTP Security Headers
        $response.Headers.Add("X-Frame-Options", "DENY")
        $response.Headers.Add("X-Content-Type-Options", "nosniff")
        $response.Headers.Add("X-XSS-Protection", "1; mode=block")
        $response.Headers.Add("Content-Security-Policy", "default-src 'self' http: https: data: 'unsafe-inline' 'unsafe-eval'")

        # Handle Preflight OPTIONS
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # API routing
        if ($url.StartsWith("/api/")) {
            # Check db file exists
            if (-not (Test-Path $dbPath)) {
                $response.StatusCode = 500
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Database not initialized"}')
                $response.ContentType = "application/json"
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.Close()
                continue
            }

            $dbContent = Get-Content -Raw -Path $dbPath -Encoding utf8 | ConvertFrom-Json

            if ($method -eq "GET" -and $url -eq "/api/matches") {
                $jsonOut = $dbContent.matches | ConvertTo-Json -Depth 10 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)

            } elseif ($method -eq "GET" -and $url -eq "/api/tickets") {
                $jsonOut = $dbContent.bookedTickets | ConvertTo-Json -Depth 10 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)

            } elseif ($method -eq "POST" -and $url -eq "/api/bookings") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $matchId = $null
                $holderName = $null
                $category = $null
                $qty = $null
                try {
                    $booking = ConvertFrom-Json $body
                    if ($null -ne $booking) {
                        $matchId = $booking.matchId
                        $holderName = $booking.holderName
                        $category = $booking.category
                        $qty = $booking.qty
                    }
                } catch {}

                if ($null -eq $matchId -or $null -eq $holderName -or $null -eq $category -or $null -eq $qty) {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Missing required booking parameters"}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                } else {
                    $match = $dbContent.matches | Where-Object { $_.id -eq $matchId }

                    if ($null -eq $match) {
                        $response.StatusCode = 404
                        $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Match not found"}')
                        $response.ContentType = "application/json"
                        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    } else {
                        if ($match.ticketsLeft -ge $qty) {
                            # Update tickets count
                            $match.ticketsLeft = $match.ticketsLeft - $qty

                            # Generate seat details
                            $sectors = @("North", "East", "South", "West")
                            $chosenSector = $sectors[(Get-Random -Maximum 4)]
                            $chosenRow = (Get-Random -Minimum 1 -Maximum 41)
                            $chosenSeat = (Get-Random -Minimum 1 -Maximum 25)
                            
                            $chosenGate = "B"
                            if ($chosenSector -eq "North") { $chosenGate = "A" }
                            elseif ($chosenSector -eq "East") { $chosenGate = "B" }
                            elseif ($chosenSector -eq "South") { $chosenGate = "C" }
                            elseif ($chosenSector -eq "West") { $chosenGate = "D" }

                            $categoryLabels = @("Category 1", "Category 2", "Category 3")
                            $level = $categoryLabels[[int]$category - 1]
                            
                            $secNum = (Get-Random -Minimum 101 -Maximum 116)
                            $secLabel = "$chosenSector $secNum"
                            $serial = "FIFA-$(Get-Random -Minimum 10000 -Maximum 99999)-2026"

                            $ticket = [PSCustomObject]@{
                                matchId = $match.id
                                team1 = $match.team1
                                team2 = $match.team2
                                team1Flag = $match.team1Flag
                                team2Flag = $match.team2Flag
                                stadium = $match.stadium
                                datetime = "$($match.date) • $($match.time)"
                                holder = $holderName
                                level = $level
                                catNum = [int]$category
                                sec = $secLabel
                                sector = $chosenSector
                                row = [int]$chosenRow
                                seat = [int]$chosenSeat
                                gate = $chosenGate
                                serial = $serial
                            }

                            # Append and Save
                            $dbContent.bookedTickets += $ticket
                            $dbContent | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding utf8

                            $ticketJson = $ticket | ConvertTo-Json -Depth 10 -Compress
                            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($ticketJson)
                            $response.StatusCode = 201
                            $response.ContentType = "application/json"
                            $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                        } else {
                            $response.StatusCode = 400
                            $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Not enough seats available"}')
                            $response.ContentType = "application/json"
                            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                        }
                    }
                }

            } elseif ($method -eq "POST" -and $url -eq "/api/tickets/verify") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $serial = $null
                try {
                    $verifyReq = ConvertFrom-Json $body
                    if ($null -ne $verifyReq) { $serial = $verifyReq.serial }
                } catch {}
                if ($null -eq $serial -or $serial -eq "") {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Serial is required"}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }
                if ($null -ne $serial) {
                    # Strip any non-alphanumeric and non-hyphen characters to prevent JSON/SQLi injections
                    $serial = $serial -replace '[^A-Za-z0-9\-]', ''
                }
                $ticket = $dbContent.bookedTickets | Where-Object { $_.serial.ToLower() -eq $serial.ToLower() }

                if ($null -ne $ticket) {
                    $resObj = [PSCustomObject]@{
                        verified = $true
                        ticket = $ticket
                    }
                    $resJson = $resObj | ConvertTo-Json -Depth 10 -Compress
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                    $response.StatusCode = 200
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                } else {
                    $resObj = [PSCustomObject]@{
                        verified = $false
                        error = "Invalid or unknown ticket serial."
                    }
                    $resJson = $resObj | ConvertTo-Json -Depth 10 -Compress
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                    $response.StatusCode = 404
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                }

            } elseif ($method -eq "POST" -and $url -eq "/api/chat") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $message = $null
                try {
                    $chatReq = ConvertFrom-Json $body
                    if ($null -ne $chatReq) { $message = $chatReq.message }
                } catch {}
                if ($null -eq $message -or $message -eq "") {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Message is required"}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    continue
                }
                if ($null -ne $message) {
                    # Sanitize inputs by stripping out XSS script tags and HTML markup
                    $message = $message -replace '<script[^>]*?>.*?</script>', ''
                    $message = $message -replace '<[^>]*?>', ''
                }
                Write-Host "RAG chat received: '$message'"

                # 1. Retrieve relevant facts (RAG)
                $contextChunks = @(Get-RelevantContext -query $message)
                Write-Host "Context chunks found: $($contextChunks.Count)"
                $retrievedText = ""
                if ($null -ne $contextChunks -and $contextChunks.Count -gt 0) {
                    foreach ($chunk in $contextChunks) {
                        $retrievedText += "Document: $($chunk.title)`nContent: $($chunk.content)`n`n"
                    }
                }

                $geminiKey = $env:GEMINI_API_KEY
                $envPath = Join-Path $folder ".env"
                if (Test-Path $envPath) {
                    Get-Content $envPath | ForEach-Object {
                        $line = $_.Trim()
                        if ($line -and -not $line.StartsWith("#")) {
                            $parts = $line.Split("=", 2)
                            if ($parts.Length -eq 2) {
                                $keyName = $parts[0].Trim()
                                $valStr = $parts[1].Trim()
                                if ($keyName -eq "GEMINI_API_KEY") {
                                    $geminiKey = $valStr
                                }
                            }
                        }
                    }
                }

                $reply = $null

                # 2. Query Gemini with RAG context
                if ($null -ne $geminiKey -and $geminiKey -ne "") {
                    try {
                        $systemInstruction = "You are the FIFA 2026 Seating Assistant Chatbot. You help fans navigate the stadium. You must answer the user's question using ONLY the facts provided in the Context below. If the context does not contain the answer, politely tell the user you don't know based on stadium guidelines. Do not make up facts. Keep answers concise, helpful, and formatted in clean markdown.`n`nContext:`n$retrievedText"
                        $uri = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"
                        
                        $partsArray = @( @{ text = $message } )
                        $contentsArray = @( @{ parts = $partsArray } )
                        
                        $sysPartsArray = @( @{ text = $systemInstruction } )
                        $sysObj = @{ parts = $sysPartsArray }
                        
                        $bodyObj = @{
                            contents = $contentsArray
                            systemInstruction = $sysObj
                        }
                        $bodyJson = $bodyObj | ConvertTo-Json -Depth 10 -Compress
                        
                        $apiRes = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyJson -ContentType "application/json" -TimeoutSec 10
                        if ($null -ne $apiRes.candidates -and $apiRes.candidates.Count -gt 0) {
                            $reply = $apiRes.candidates[0].content.parts[0].text
                        }
                    } catch {
                        Write-Host "Gemini RAG API failed, using fallback RAG: $_"
                    }
                }

                # 3. Fallback Offline RAG Mode (directly return retrieved document facts)
                if ($null -eq $reply) {
                    if ($retrievedText -ne "") {
                        $factsText = ""
                        foreach ($chunk in $contextChunks) {
                            $factsText += "[Fact] **$($chunk.title)**`n$($chunk.content)`n`n"
                        }
                        $reply = "[Seat Guide Assistant - Offline RAG Mode]`nHere are the official stadium guidelines I retrieved for your question:`n`n$factsText*(Configure a GEMINI_API_KEY inside .env to enable full conversational AI responses!)*"
                    } else {
                        $reply = "[Seat Guide Assistant]`nI couldn't find any specific match in the stadium database for your query. I can help you with gate access, bag policy, food options, elevators, or first aid. Try asking: *'What is the bag policy?'* or *'Where are restrooms?'*"
                    }
                }

                $resObj = [PSCustomObject]@{
                    response = $reply
                }
                $resJson = $resObj | ConvertTo-Json -Depth 10 -Compress
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } elseif ($method -eq "GET" -and $url -eq "/api/admin/incidents") {
                $jsonOut = $dbContent.incidents | ConvertTo-Json -Depth 10 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)

            } elseif ($method -eq "POST" -and $url -eq "/api/admin/incidents") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $sector = $null
                $category = $null
                $severity = $null
                $description = $null
                try {
                    $incidentReq = ConvertFrom-Json $body
                    if ($null -ne $incidentReq) {
                        $sector = $incidentReq.sector
                        $category = $incidentReq.category
                        $severity = $incidentReq.severity
                        $description = $incidentReq.description
                    }
                } catch {}

                if ($null -eq $sector -or $null -eq $category -or $null -eq $severity -or $null -eq $description) {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Missing required incident fields"}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                } else {
                    $newIncident = [PSCustomObject]@{
                        id = "inc-$(Get-Random -Minimum 10000 -Maximum 99999)"
                        sector = $sector
                        category = $category
                        severity = $severity
                        description = $description
                        status = "ACTIVE"
                        timestamp = (Get-Date -Format "MMMM dd, yyyy • HH:mm")
                    }

                    $dbContent.incidents += $newIncident
                    $dbContent | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding utf8

                    $resJson = $newIncident | ConvertTo-Json -Depth 10 -Compress
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                    $response.StatusCode = 201
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                }

            } elseif ($method -eq "POST" -and $url -eq "/api/admin/incidents/resolve") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $incId = $null
                try {
                    $resolveReq = ConvertFrom-Json $body
                    if ($null -ne $resolveReq) { $incId = $resolveReq.id }
                } catch {}
                $found = $false

                foreach ($inc in $dbContent.incidents) {
                    if ($inc.id -eq $incId) {
                        $inc.status = "RESOLVED"
                        $found = $true
                    }
                }

                if (-not $found) {
                    $response.StatusCode = 404
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Incident not found"}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                } else {
                    $dbContent | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding utf8

                    $resObj = [PSCustomObject]@{ success = $true }
                    $resJson = $resObj | ConvertTo-Json -Depth 10 -Compress
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                    $response.StatusCode = 200
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                }

            } elseif ($method -eq "POST" -and $url -eq "/api/admin/simulate") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $simReq = ConvertFrom-Json $body
                $eventType = $simReq.type

                $newIncident = $null
                if ($eventType -eq "congestion") {
                    $newIncident = [PSCustomObject]@{
                        id = "inc-$(Get-Random -Minimum 10000 -Maximum 99999)"
                        sector = "East"
                        category = "Crowd Congestion"
                        severity = "HIGH"
                        description = "Simulated spike: Gate B crowd density reached 94%. Dispatched additional volunteer escorts."
                        status = "ACTIVE"
                        timestamp = (Get-Date -Format "MMMM dd, yyyy • HH:mm")
                    }
                } else {
                    $newIncident = [PSCustomObject]@{
                        id = "inc-$(Get-Random -Minimum 10000 -Maximum 99999)"
                        sector = "West"
                        category = "Infrastructure Delay"
                        severity = "MEDIUM"
                        description = "Simulated delay: West Concourse elevator power cycle. Escalators open."
                        status = "ACTIVE"
                        timestamp = (Get-Date -Format "MMMM dd, yyyy • HH:mm")
                    }
                }

                $dbContent.incidents += $newIncident
                $dbContent | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding utf8

                $resJson = $newIncident | ConvertTo-Json -Depth 10 -Compress
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.StatusCode = 201
                $response.ContentType = "application/json"
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "API route not found"}')
                $response.ContentType = "application/json"
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        } else {
            # Serve Static Files
            if ($url -eq "/") { $url = "/index.html" }
            $url = $url.Replace("..", "") # Clean traversal paths
            $file = Join-Path $publicFolder $url
            
            if (Test-Path $file -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($file)
                
                # Content Type mapping
                if ($file.EndsWith(".html")) { $response.ContentType = "text/html" }
                elseif ($file.EndsWith(".css")) { $response.ContentType = "text/css" }
                elseif ($file.EndsWith(".js")) { $response.ContentType = "application/javascript" }
                elseif ($file.EndsWith(".png")) { $response.ContentType = "image/png" }
                elseif ($file.EndsWith(".jpg") -or $file.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
                elseif ($file.EndsWith(".svg")) { $response.ContentType = "image/svg+xml" }
                
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        }
        $response.Close()
    }
} catch {
    Write-Host "Server stopped: $_"
} finally {
    $listener.Stop()
}
