param(
    [string[]]$Suites = @('test:integration', 'test:modules:isolated', 'test:real:api', 'test:real:ui', 'test:academic:isolated')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $frontendRoot 'docker-compose.e2e.yml'
$projectName = 'shuji-e2e-' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
$runId = $projectName.Substring('shuji-e2e-'.Length)
$apiPort = 18080
$frontendPort = 4200
$composeStarted = $false
$frontendProcess = $null
$frontendErr = $null
$composeEnvFile = $null
$artifactDir = $null
$backendBuildContext = $null
$exitCode = 0
$environmentKeys = @(
    'E2E_ISOLATED', 'E2E_RUN_ID', 'E2E_API_BASE', 'E2E_FRONT_BASE',
    'E2E_USERNAME', 'E2E_PASSWORD', 'E2E_CHROME', 'E2E_ARTIFACT_DIR'
)
$previousEnvironment = @{}
foreach ($key in $environmentKeys) {
    $previousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}

function New-RandomToken {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', 'A').Replace('/', 'B')
}

function Assert-PortAvailable([int]$Port) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
    } catch {
        throw "El puerto $Port ya está ocupado. Libéralo antes de iniciar el entorno E2E."
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

function Wait-Port([int]$Port, [System.Diagnostics.Process]$Process, [string]$Service, [string]$LogPath) {
    for ($attempt = 0; $attempt -lt 180; $attempt++) {
        if ($Process -and $Process.HasExited) {
            throw "$Service terminó antes de abrir el puerto. Revisa: $LogPath"
        }
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $connect = $client.ConnectAsync('127.0.0.1', $Port)
            if ($connect.Wait(300) -and $client.Connected) { return }
        } catch {
        } finally {
            $client.Dispose()
        }
        Start-Sleep -Seconds 1
    }
    throw "Timeout esperando $Service en el puerto $Port. Revisa: $LogPath"
}

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'No encontré Docker CLI. Instala/activa Docker Desktop y vuelve a ejecutar.'
    }
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'El motor de Docker no está disponible. El bridge se detuvo sin iniciar contenedores.'
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'La instalación de Docker no incluye Docker Compose v2.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules\@angular\cli\bin\ng.js'))) {
        throw 'Faltan dependencias del frontend. Ejecuta npm ci en frontend y vuelve a intentar.'
    }
    Assert-PortAvailable $apiPort
    Assert-PortAvailable $frontendPort
    Assert-PortAvailable 18025

    $artifactDir = Join-Path $env:TEMP $projectName
    New-Item -ItemType Directory -Path $artifactDir | Out-Null
    $backendRoot = Join-Path $frontendRoot '..\backend'
    $backendBuildContext = Join-Path $artifactDir 'backend-build'
    New-Item -ItemType Directory -Path $backendBuildContext | Out-Null
    Copy-Item -LiteralPath (Join-Path $backendRoot 'Dockerfile') -Destination $backendBuildContext
    Copy-Item -LiteralPath (Join-Path $backendRoot 'pom.xml') -Destination $backendBuildContext
    Copy-Item -LiteralPath (Join-Path $backendRoot 'src') -Destination $backendBuildContext -Recurse
    $composeEnvFile = Join-Path $artifactDir 'compose.env'
    $databasePassword = New-RandomToken
    $jwtSecret = New-RandomToken
    $loginPassword = New-RandomToken
    $loginUsername = 'e2e_dir_' + $runId
    $loginEmail = $loginUsername + '@local.test'

    @(
        "E2E_DB_PASSWORD=$databasePassword"
        "E2E_JWT_SECRET=$jwtSecret"
        "E2E_API_PORT=$apiPort"
        "E2E_BACKEND_CONTEXT=$($backendBuildContext.Replace('\', '/'))"
    ) | Set-Content -LiteralPath $composeEnvFile -Encoding ascii

    $composeArgs = @(
        '--env-file', $composeEnvFile,
        '--project-directory', $frontendRoot,
        '-f', $composeFile,
        '-p', $projectName
    )

    & docker compose @composeArgs config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'La configuración de Docker Compose E2E no es válida.' }

    Write-Host 'Levantando PostgreSQL, Redis y API desechables...'
    $composeStarted = $true
    & docker compose @composeArgs up --detach --build
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron levantar los servicios E2E.' }

    $containerLog = Join-Path $artifactDir 'containers.log'
    Wait-Port $apiPort $null 'API E2E' $containerLog
    $apiReady = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/api/v1/auth/login" -SkipHttpErrorCheck -TimeoutSec 2
            if ($response) { $apiReady = $true; break }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $apiReady) { throw 'La API E2E no respondió por HTTP a través del relay.' }

    if ($loginUsername -notmatch '^e2e_dir_[a-f0-9]+$' -or $loginPassword.Length -lt 40) {
        throw 'No se pudo generar una identidad temporal válida.'
    }
    $seedSql = @"
\set login_username $loginUsername
\set login_email $loginEmail
\set login_password $loginPassword
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO public.roles (codigo_rol, nombre_rol)
VALUES
  ('DIRECCION', 'Direccion'),
  ('SECRETARIA', 'Secretaria'),
  ('DOCENTE', 'Docente'),
  ('AUXILIAR', 'Auxiliar'),
  ('TUTOR', 'Tutor'),
  ('APODERADO', 'Apoderado')
ON CONFLICT (codigo_rol) DO NOTHING;
INSERT INTO public.niveles (codigo_nivel, nombre_nivel)
SELECT catalogo.codigo, catalogo.nombre
FROM (VALUES
  ('INICIAL', 'Inicial'),
  ('PRIMARIA', 'Primaria'),
  ('SECUNDARIA', 'Secundaria')
) AS catalogo(codigo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.niveles n WHERE n.codigo_nivel = catalogo.codigo
);
WITH e2e_user AS (
  INSERT INTO public.usuarios (
    nombre_usuario, correo_electronico, usuario_password, nombre_completo, activo
  )
  VALUES (
    :'login_username', :'login_email', crypt(:'login_password', gen_salt('bf', 10)),
    'Direccion E2E', true
  )
  RETURNING id
)
INSERT INTO public.usuario_roles (usuario_id, rol_id)
SELECT e2e_user.id, roles.id
FROM e2e_user
JOIN public.roles roles ON roles.codigo_rol = 'DIRECCION';

WITH apoderado_fixture AS (
  INSERT INTO public.usuarios (nombre_usuario, correo_electronico, usuario_password, nombre_completo, activo)
  VALUES ('e2e_guardian_$runId', 'e2e_guardian_$runId@local.test',
    crypt(:'login_password', gen_salt('bf', 10)), 'Apoderado de prueba', true)
  RETURNING id
)
INSERT INTO public.usuario_roles (usuario_id, rol_id)
SELECT apoderado_fixture.id, roles.id FROM apoderado_fixture
JOIN public.roles roles ON roles.codigo_rol = 'APODERADO';
"@

    Write-Host 'Preparando cuenta y catálogos ficticios solo en la base desechable...'
    $seedSql | & docker compose @composeArgs exec -T postgres psql -v ON_ERROR_STOP=1 -U e2e -d shuji_e2e
    if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación del usuario/catálogo E2E.' }

    $node = (Get-Command node -ErrorAction Stop).Source
    $ngCli = 'node_modules/@angular/cli/bin/ng.js'
    $frontendOut = Join-Path $artifactDir 'frontend.log'
    $frontendErr = Join-Path $artifactDir 'frontend-error.log'
    $frontendProcess = Start-Process -FilePath $node -ArgumentList @($ngCli, 'serve', '--proxy-config', 'proxy.e2e.conf.json', '--host', '127.0.0.1', '--port', "$frontendPort") -WorkingDirectory $frontendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr

    $chromeCandidates = @(
        $env:E2E_CHROME,
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    if (-not $chromeCandidates) {
        throw 'No encontré Chrome/Edge para Puppeteer. Define E2E_CHROME con la ruta local del navegador.'
    }
    $chrome = $chromeCandidates | Select-Object -First 1
    Wait-Port $frontendPort $frontendProcess 'Frontend E2E' $frontendErr

    $env:E2E_ISOLATED = '1'
    $env:E2E_RUN_ID = $runId
    $env:E2E_API_BASE = "http://127.0.0.1:$apiPort/api/v1"
    $env:E2E_FRONT_BASE = "http://127.0.0.1:$frontendPort"
    $env:E2E_USERNAME = $loginUsername
    $env:E2E_PASSWORD = $loginPassword
    $env:E2E_CHROME = $chrome
    $env:E2E_ARTIFACT_DIR = $artifactDir

    Push-Location $frontendRoot
    try {
        $testLog = Join-Path $artifactDir 'e2e-tests.log'
        foreach ($scriptName in $Suites) {
            Write-Host "Ejecutando $scriptName..."
            & npm run $scriptName 2>&1 | Tee-Object -FilePath $testLog -Append
            $suiteExitCode = $LASTEXITCODE
            if ($suiteExitCode -ne 0) {
                $exitCode = 1
                Write-Host "Falló $scriptName con código $suiteExitCode."
            }
        }
    } finally {
        Pop-Location
    }
    if ($exitCode -eq 0) { Write-Host 'Todas las suites E2E terminaron correctamente.' }
    else { Write-Host 'Una o más suites E2E fallaron.' }
    Write-Host "Artefactos y logs: $artifactDir"
} catch {
    $exitCode = 1
    Write-Host "E2E aislado detenido: $($_.Exception.Message)"
    if ($artifactDir) {
        if ($composeStarted -and $composeEnvFile -and (Test-Path -LiteralPath $composeEnvFile)) {
            $diagnosticArgs = @(
                '--env-file', $composeEnvFile,
                '--project-directory', $frontendRoot,
                '-f', $composeFile,
                '-p', $projectName
            )
            & docker compose @diagnosticArgs logs --no-color 2>&1 | Set-Content -LiteralPath (Join-Path $artifactDir 'containers.log')
        }
        Write-Host "Artefactos y logs: $artifactDir"
    }
} finally {
    foreach ($key in $environmentKeys) {
        [Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key], 'Process')
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($composeStarted -and $composeEnvFile -and (Test-Path -LiteralPath $composeEnvFile)) {
        $composeArgs = @(
            '--env-file', $composeEnvFile,
            '--project-directory', $frontendRoot,
            '-f', $composeFile,
            '-p', $projectName
        )
        & docker compose @composeArgs down --volumes --remove-orphans *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "No se pudo limpiar el proyecto temporal $projectName; reintenta docker compose down con ese nombre."
            $exitCode = 1
        }
    }
    if ($composeEnvFile -and (Test-Path -LiteralPath $composeEnvFile)) {
        Remove-Item -LiteralPath $composeEnvFile -Force
    }
    if ($artifactDir -and $backendBuildContext -and (Test-Path -LiteralPath $backendBuildContext)) {
        $resolvedArtifactRoot = (Resolve-Path -LiteralPath $artifactDir).Path.TrimEnd('\') + '\'
        $resolvedBuildContext = (Resolve-Path -LiteralPath $backendBuildContext).Path
        if (-not $resolvedBuildContext.StartsWith($resolvedArtifactRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Se canceló la limpieza porque el contexto de build no está dentro del directorio temporal de esta ejecución.'
        }
        Remove-Item -LiteralPath $resolvedBuildContext -Recurse -Force
    }
}

exit $exitCode
