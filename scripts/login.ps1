# -----------------------------------------------------------------------------
# SCRIPT POWERSHELL: LOGIN E CAPTURA DE TOKEN JWT PARA NFS-E BACKEND
# -----------------------------------------------------------------------------
# Este script realiza o login de forma automatizada e copia o JWT para sua Área de Transferência.
# -----------------------------------------------------------------------------

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "         Viggo NFS-e - Sistema de Login & Captura de JWT Token       " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Configurações de Servidor
$DefaultUrl = "http://localhost:3000"
$ServerUrl = Read-Host "Digite a URL base do seu servidor backend Node.js [Padrão: $DefaultUrl]"
if ([string]::IsNullOrWhiteSpace($ServerUrl)) {
    $ServerUrl = $DefaultUrl
}

# Garante que a URL não termine com barra /
$ServerUrl = $ServerUrl.TrimEnd('/')

# 2. Entrada de Credenciais
$Email = Read-Host "Digite o E-mail de cadastro do Psicólogo"
$Password = Read-Host -AsSecureString "Digite a Senha do Psicólogo"

# Converte a senha criptografada do SecureString para texto puro para envio
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# 3. Monta o payload da requisição
$Body = @{
    email = $Email
    senha = $PlainPassword
} | ConvertTo-Json

# 4. Faz a requisição POST para a rota /login
Write-Host "`n[Sistema] Comunicando com o backend em: $ServerUrl/login ..." -ForegroundColor Yellow

try {
    $Response = Invoke-RestMethod -Uri "$ServerUrl/login" -Method Post -ContentType "application/json" -Body $Body
    
    if ($Response.sucesso) {
        $Token = $Response.access_token
        $UserId = $Response.user_id
        
        # Copia automaticamente para a Área de Transferência do Windows
        $Token | clip
        
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host "                  LOGIN EFETUADO COM SUCESSO!                        " -ForegroundColor Green
        Write-Host "=====================================================================" -ForegroundColor Green
        Write-Host "User ID do Psicólogo no Supabase: " -NoNewline
        Write-Host "$UserId" -ForegroundColor White
        Write-Host "`nToken JWT (Access Token) gerado: " -ForegroundColor Yellow
        Write-Host "$Token" -ForegroundColor DarkGray
        Write-Host "=====================================================================" -ForegroundColor Green
        Write-Host "`n[SUCESSO] O Token JWT foi copiado AUTOMATICAMENTE para a sua área de transferência!" -ForegroundColor Green
        Write-Host "[DICA] Abra o Postman/Thunder Client e cole no campo 'Bearer Token'." -ForegroundColor Green
    } else {
        Write-Host "`n[ERRO] O servidor backend respondeu com erro: $($Response.mensagem)" -ForegroundColor Red
    }
}
catch {
    $ErrorMsg = $_.Exception.Message
    # Tenta ler mensagem do corpo em caso de erro HTTP
    if ($_.Exception.Response) {
        $StreamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $ErrBody = $StreamReader.ReadToEnd() | ConvertFrom-Json
        if ($ErrBody.mensagem) {
            $ErrorMsg = $ErrBody.mensagem
        }
    }
    Write-Host "`n[ERRO] Falha ao comunicar com o servidor backend: $ErrorMsg" -ForegroundColor Red
}

Write-Host "`nPressione qualquer tecla para sair..." -ForegroundColor Gray
[void][System.Console]::ReadKey($true)
