# Regression smoke for UI crash fixes (issue #runtime-errors)
# Requires: network, valid demo credentials on Fly/local
$Base = if ($env:SMOKE_BASE) { $env:SMOKE_BASE } else { "https://vizzel-track-demo-boss.fly.dev" }
$Email = if ($env:SMOKE_EMAIL) { $env:SMOKE_EMAIL } else { "admin@demo.local" }
$Pass = if ($env:SMOKE_PASS) { $env:SMOKE_PASS } else { "demo1234" }

function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }
function Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

$loginBody = @{ email = $Email; password = $Pass } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$Base/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
if (-not $login.access_token) { Fail "login no token" }
$token = $login.access_token
$orgId = $login.user.organization_id
$headers = @{ Authorization = "Bearer $token" }
Ok "login org=$orgId"

function Get-Json($path) {
  return Invoke-RestMethod -Uri "$Base$path" -Headers $headers
}

# ISSUE-1: Personal dashboard — status must expose numeric `value`
$ps = Get-Json "/dashboard/personal/status"
if (-not ($ps.data -is [Array])) { Fail "personal/status data not array" }
if ($ps.data.Count -gt 0) {
  $v = $ps.data[0].value
  if ($null -eq $v -or $v -isnot [int] -and $v -isnot [long] -and $v -isnot [double]) {
    Fail "personal/status missing numeric value field"
  }
}
Ok "personal/status shape"

# ISSUE-2: Personal assets — rows should be objects (assetName/assetValue)
$pa = Get-Json "/dashboard/personal/assets?page=1&pageSize=5"
$rows = $pa.data.data
if ($null -eq $rows) { Fail "personal/assets nested data missing" }
if (-not ($rows -is [Array])) { Fail "personal/assets rows not array" }
Ok "personal/assets shape ($($rows.Count) rows)"

# ISSUE-3: Organization structure list — must be array under .data
$inst = Get-Json "/api/v1/organization/institutes"
if ($null -ne $inst.data -and -not ($inst.data -is [Array])) { Fail "organization/institutes data not array" }
$instCount = if ($inst.data -is [Array]) { $inst.data.Count } else { 0 }
Ok "organization/institutes ($instCount rows, null-safe)"

# ISSUE-4: Withdrawal users — must include id + name or nested user
$users = Get-Json "/user/organization/$orgId/1/10"
if (-not ($users.data -is [Array])) { Fail "user org list data not array" }
if ($users.data.Count -gt 0) {
  $u0 = $users.data[0]
  $hasNested = $null -ne $u0.user
  $hasFlat = $null -ne $u0.id -and ($null -ne $u0.name -or $null -ne $u0.email)
  if (-not $hasNested -and -not $hasFlat) { Fail "user row missing user/id fields" }
}
Ok "withdrawal users shape"

# ISSUE-5: Facility buildings — array for withdrawal form
$bld = Get-Json "/facility/building/get/$orgId"
if (-not ($bld -is [Array])) { Fail "facility buildings not array" }
Ok "facility buildings ($($bld.Count) items)"

# ISSUE-6: SPA shell — login page must reference built CSS (Tailwind)
$html = (Invoke-WebRequest -Uri "$Base/login" -UseBasicParsing).Content
if ($html -notmatch 'assets/index-[^"]+\.css') { Fail "login HTML missing CSS bundle" }
Ok "login page includes CSS bundle"

# ISSUE-7: Asset list — each row must have numeric id
$assetList = Get-Json "/asset/get/$orgId/1/5"
if (-not ($assetList.data -is [Array])) { Fail "asset list data not array" }
if ($assetList.data.Count -gt 0 -and $null -eq $assetList.data[0].id) {
  Fail "asset list row missing id"
}
Ok "asset list ($($assetList.data.Count) rows with id)"

# ISSUE-8: Dashboard bundle — single initial-data + gov depreciation (net book >= 1)
$init = Get-Json "/dashboard/initial-data/$orgId"
if ($null -eq $init.data.summary) { Fail "dashboard initial-data missing summary" }
if ($null -eq $init.data.depreciation) { Fail "dashboard initial-data missing depreciation" }
$nb = [int64]$init.data.summary.netBookValue
$tv = [int64]$init.data.summary.totalAssetValue
if ($tv -gt 1 -and $nb -lt 1) { Fail "net book below 1 baht gov rule" }
Ok "dashboard initial-data (netBook=$nb, total=$tv)"

Write-Host "`nAll issue regression checks passed." -ForegroundColor Cyan
