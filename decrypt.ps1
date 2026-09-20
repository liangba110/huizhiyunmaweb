# 汇智云码 敏感文件解密（Windows PowerShell）
# 用法:  .\decrypt.ps1            -> 全部解密到 _local-secrets\
#        .\decrypt.ps1 -File sshx.py.enc
param(
    [string]$File = "",
    [string]$OutDir = "_local-secrets"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not $env:HZY_SECRET) {
    $sec = Read-Host "请输入解密口令" -AsSecureString
    $env:HZY_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

$tool = Join-Path $root "tools\secrets_tool.py"

if ($File) {
    $src = Join-Path $root "secrets-enc\$File"
    $dst = Join-Path $root "$OutDir\$($File -replace '\.enc$','')"
    python $tool dec $src $dst
} else {
    python $tool decdir (Join-Path $root "secrets-enc") (Join-Path $root $OutDir)
}

Write-Host "`n完成。明文已还原到 $OutDir\" -ForegroundColor Green
