# PowerShell E2E REST API Integration Test Suite
# Run: powershell -ExecutionPolicy Bypass -File .\tests\api.test.ps1

$baseUrl = "http://localhost:8000"
$passed = 0
$failed = 0

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting PowerShell API Integration Test Suite   " -ForegroundColor Cyan
Write-Host " Target Server: $baseUrl                           " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

function Assert-Test {
    param (
        [string]$Name,
        [scriptblock]$Condition
    )
    try {
        $result = &$Condition
        if ($result) {
            Write-Host "✅ PASS: $Name" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "❌ FAIL: $Name (Assertion returned false)" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host "❌ FAIL: $Name (Exception: $_)" -ForegroundColor Red
        $script:failed++
    }
}

# 1. GET /api/matches
Assert-Test "GET /api/matches - Retrieve Matches list" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/matches" -Method Get
    return ($null -ne $res -and $res.Count -ge 4 -and $null -ne $res[0].team1)
}

# 2. GET /api/tickets
Assert-Test "GET /api/tickets - Retrieve scan tickets list" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/tickets" -Method Get
    return ($null -ne $res)
}

# 3. POST /api/bookings & Verify Seat Decrement
$testSerial = ""
Assert-Test "POST /api/bookings - Book Category 1 Seat" {
    $matchesBefore = Invoke-RestMethod -Uri "$baseUrl/api/matches" -Method Get
    $match1Before = $matchesBefore | Where-Object { $_.id -eq "m1" }
    $seatsBefore = $match1Before.ticketsLeft

    $body = @{
        matchId = "m1"
        holderName = "Jane Doe"
        category = 1
        qty = 1
    } | ConvertTo-Json -Compress

    $ticket = Invoke-RestMethod -Uri "$baseUrl/api/bookings" -Method Post -Body $body -ContentType "application/json"
    $script:testSerial = $ticket.serial

    $matchesAfter = Invoke-RestMethod -Uri "$baseUrl/api/matches" -Method Get
    $match1After = $matchesAfter | Where-Object { $_.id -eq "m1" }
    $seatsAfter = $match1After.ticketsLeft

    return ($ticket.holder -eq "Jane Doe" -and ($seatsBefore - $seatsAfter -eq 1))
}

# 4. POST /api/tickets/verify (Success case)
Assert-Test "POST /api/tickets/verify - Verify valid serial" {
    if (-not $testSerial) { return $false }
    $body = @{ serial = $testSerial } | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "$baseUrl/api/tickets/verify" -Method Post -Body $body -ContentType "application/json"
    return ($res.verified -eq $true -and $res.ticket.holder -eq "Jane Doe")
}

# 5. POST /api/tickets/verify (Failure case)
Assert-Test "POST /api/tickets/verify - Fail on invalid serial" {
    try {
        $body = @{ serial = "FIFA-INVALID-SERIAL" } | ConvertTo-Json -Compress
        $res = Invoke-WebRequest -Uri "$baseUrl/api/tickets/verify" -Method Post -Body $body -ContentType "application/json"
        return $false
    } catch {
        # Expecting 404 status
        $status = $_.Exception.Response.StatusCode
        return ($status -eq "NotFound")
    }
}

# 6. POST /api/chat - RAG retriever search (bag policy)
Assert-Test "POST /api/chat - Retrieve RAG context bag policy" {
    $body = @{ message = "What is the bag policy?" } | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $body -ContentType "application/json"
    return ($res.response.ToLower().Contains("bag") -and $res.response.ToLower().Contains("clear"))
}

# 7. GET /api/admin/incidents
Assert-Test "GET /api/admin/incidents - Retrieve incidents" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/incidents" -Method Get
    return ($null -ne $res -and $res.Count -gt 0)
}

# 8. POST /api/admin/incidents & Resolution Pipeline
Assert-Test "POST /api/admin/incidents & POST /api/admin/incidents/resolve - Dispatch & Resolve incident" {
    # 1. Dispatch
    $body = @{
        sector = "South"
        category = "Medical"
        severity = "HIGH"
        description = "Test dispatcher medical alert."
    } | ConvertTo-Json -Compress
    $newInc = Invoke-RestMethod -Uri "$baseUrl/api/admin/incidents" -Method Post -Body $body -ContentType "application/json"
    $incId = $newInc.id

    # 2. Verify in list
    $list = Invoke-RestMethod -Uri "$baseUrl/api/admin/incidents" -Method Get
    $found = $list | Where-Object { $_.id -eq $incId }
    if ($null -eq $found -or $found.status -ne "ACTIVE") { return $false }

    # 3. Resolve
    $resolveBody = @{ id = $incId } | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/incidents/resolve" -Method Post -Body $resolveBody -ContentType "application/json"

    # 4. Verify resolved
    $list2 = Invoke-RestMethod -Uri "$baseUrl/api/admin/incidents" -Method Get
    $found2 = $list2 | Where-Object { $_.id -eq $incId }
    return ($found2.status -eq "RESOLVED")
}

# 9. POST /api/admin/simulate
Assert-Test "POST /api/admin/simulate - Trigger congestion bottleneck simulation" {
    $body = @{ type = "congestion" } | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri "$baseUrl/api/admin/simulate" -Method Post -Body $body -ContentType "application/json"
    return ($res.category -eq "Crowd Congestion" -and $res.status -eq "ACTIVE")
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Test Suite Results Summary                      " -ForegroundColor Cyan
Write-Host " Total Passed: $passed                         " -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host " Total Failed: $failed                         " -ForegroundColor Red
} else {
    Write-Host " Total Failed: $failed                         " -ForegroundColor Green
}
Write-Host "==================================================" -ForegroundColor Cyan

exit $failed
