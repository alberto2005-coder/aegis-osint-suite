<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// ============================================================
// CONFIGURACIÓN: pon tu clave de Groq aquí
// ============================================================
define('GROQ_API_KEY', 'TU_CLAVE_API_AQUÍ');

// ============================================================
// ROUTER: selecciona la acción según el parámetro ?action=
// ============================================================
$action = $_GET['action'] ?? 'groq';

// ── ACCIÓN: check  ──────────────────────────────────────────
// Comprueba si una URL devuelve 200 (perfil existe).
// Llamada: GET proxy.php?action=check&url=https://...
// ────────────────────────────────────────────────────────────
if ($action === 'check') {
    $url = $_GET['url'] ?? '';
    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['error' => 'URL inválida o no proporcionada']);
        exit;
    }

    // Lista de User-Agents aleatorios para simular múltiples navegadores
    $userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    ];
    $randomUA = $userAgents[array_rand($userAgents)];

    // Función interna para obtener y cachear proxies de listas públicas gratuitas
    $getProxies = function() {
        $cacheFile = __DIR__ . '/proxies_cache.txt';
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 600)) {
            $cached = file($cacheFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!empty($cached)) return $cached;
        }

        $sources = [
            'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all',
            'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
            'https://raw.githubusercontent.com/clket/Proxy-List/master/http.txt'
        ];

        $list = [];
        foreach ($sources as $src) {
            $ch = curl_init($src);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 4,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);
            $res = curl_exec($ch);
            curl_close($ch);

            if ($res) {
                $lines = explode("\n", str_replace("\r", "", $res));
                foreach ($lines as $l) {
                    $l = trim($l);
                    if (preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/', $l)) {
                        $list[] = $l;
                    }
                }
            }
            if (count($list) > 100) break;
        }

        if (!empty($list)) {
            file_put_contents($cacheFile, implode("\n", $list));
        }
        return $list;
    };

    $proxies = $getProxies();
    $body = '';
    $httpCode = 0;
    $finalUrl = $url;
    $success = false;

    // Estrategia de reintentos: 1) Intento directo, 2) Proxy aleatorio 1, 3) Proxy aleatorio 2
    for ($attempt = 1; $attempt <= 3; $attempt++) {
        $ch = curl_init($url);
        $curlOpts = [
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_FOLLOWLOCATION  => true,
            CURLOPT_MAXREDIRS       => 4,
            CURLOPT_TIMEOUT         => ($attempt === 1) ? 6 : 4, // menor timeout con proxies para no ralentizar demasiado
            CURLOPT_SSL_VERIFYPEER  => false, // evitamos fallos SSL en entornos locales/compartidos
            CURLOPT_HTTPHEADER      => [
                "User-Agent: $randomUA",
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
                'Cache-Control: no-cache',
                'Pragma: no-cache'
            ]
        ];

        // Aplicamos proxy si no es el primer intento
        if ($attempt > 1 && !empty($proxies)) {
            $selectedProxy = $proxies[array_rand($proxies)];
            $curlOpts[CURLOPT_PROXY] = $selectedProxy;
            $curlOpts[CURLOPT_PROXYTYPE] = CURLPROXY_HTTP;
        }

        curl_setopt_array($ch, $curlOpts);
        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $curlErr = curl_errno($ch);
        curl_close($ch);

        // Si devuelve un código de éxito aceptable y no hay errores curl, terminamos
        if (!$curlErr && $httpCode > 0 && $httpCode !== 429 && $httpCode < 500) {
            $success = true;
            break;
        }
    }

    if (!$success && empty($body)) {
        echo json_encode(['status' => 0, 'error' => true, 'message' => 'Límite de peticiones alcanzado o destino inaccesible']);
        exit;
    }

    $bodyLower = strtolower($body ?? '');
    $notFoundPatterns = [
        'sorry, this page isn',
        'page not found',
        'user not found',
        'this account doesn',
        'we can\'t find that user',
        '404',
        'no existe',
        'no user found',
        'profile_error'
    ];
    
    $textNotFound = false;
    foreach ($notFoundPatterns as $pattern) {
        if (str_contains($bodyLower, $pattern)) {
            $textNotFound = true;
            break;
        }
    }

    echo json_encode([
        'status'        => $httpCode,
        'textNotFound'  => $textNotFound,
        'finalUrl'      => $finalUrl,
        'proxyUsed'     => isset($selectedProxy) ? true : false
    ]);
    exit;
}

// ── ACCIÓN: analyze  ───────────────────────────────────────
// Análisis completo de una web: cabeceras, seguridad, tecnologías, SSL, IP.
// Llamada: GET proxy.php?action=analyze&url=https://ejemplo.com
// ────────────────────────────────────────────────────────────
if ($action === 'analyze') {
    $rawInput = $_GET['url'] ?? $_GET['domain'] ?? '';
    if (empty($rawInput)) { http_response_code(400); echo json_encode(['error'=>'Falta url o domain']); exit; }
    if (!preg_match('/^https?:\/\//i', $rawInput)) $rawInput = 'https://' . $rawInput;

    $curlOpts = [
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_HEADER          => true,
        CURLOPT_FOLLOWLOCATION  => true,
        CURLOPT_MAXREDIRS       => 3,
        CURLOPT_TIMEOUT         => 15,
        CURLOPT_SSL_VERIFYPEER  => true,
        CURLOPT_CERTINFO        => true,
        CURLOPT_HTTPHEADER      => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept: text/html,application/xhtml+xml,*/*;q=0.9',
            'Accept-Language: es-ES,es;q=0.9',
        ],
    ];

    $ch = curl_init($rawInput);
    curl_setopt_array($ch, $curlOpts);
    $t0 = microtime(true);
    $response  = curl_exec($ch);
    $respTime  = round((microtime(true) - $t0) * 1000);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $hdrSize   = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $primaryIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);
    $certInfo  = curl_getinfo($ch, CURLINFO_CERTINFO);
    $curlErr   = curl_errno($ch);
    curl_close($ch);

    // Fallback HTTP si HTTPS falla
    if ($curlErr || !$response) {
        $rawInput = str_replace('https://', 'http://', $rawInput);
        $ch = curl_init($rawInput);
        curl_setopt_array($ch, array_merge($curlOpts, [CURLOPT_SSL_VERIFYPEER => false]));
        $t0 = microtime(true);
        $response  = curl_exec($ch);
        $respTime  = round((microtime(true) - $t0) * 1000);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $hdrSize   = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $primaryIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);
        $certInfo  = curl_getinfo($ch, CURLINFO_CERTINFO);
        curl_close($ch);
    }

    // Parsear cabeceras HTTP
    $rawHdrStr = substr($response ?? '', 0, $hdrSize);
    $body      = substr($response ?? '', $hdrSize);
    $headers   = [];
    foreach (explode("\r\n", $rawHdrStr) as $line) {
        if (str_contains($line, ':')) {
            [$k, $v] = explode(':', $line, 2);
            $headers[strtolower(trim($k))] = trim($v);
        }
    }

    // ── Cabeceras de seguridad ──────────────────────────────
    $secChecks = [
        'strict-transport-security' => ['name'=>'HSTS',                   'desc'=>'Fuerza HTTPS. Sin él el navegador puede conectar por HTTP inseguro.',        'severity'=>'high'],
        'content-security-policy'   => ['name'=>'Content-Security-Policy','desc'=>'Evita ataques XSS definiendo fuentes de contenido permitidas.',              'severity'=>'high'],
        'x-frame-options'           => ['name'=>'X-Frame-Options',        'desc'=>'Bloquea que la web se embeba en iframes (clickjacking).',                    'severity'=>'medium'],
        'x-content-type-options'    => ['name'=>'X-Content-Type-Options', 'desc'=>'Impide que el navegador adivine el tipo MIME de respuestas.',                'severity'=>'medium'],
        'referrer-policy'           => ['name'=>'Referrer-Policy',        'desc'=>'Controla qué información de URL se comparte al navegar hacia otro sitio.',   'severity'=>'low'],
        'permissions-policy'        => ['name'=>'Permissions-Policy',     'desc'=>'Restringe el acceso a APIs del navegador (cámara, micrófono, etc.).',        'severity'=>'low'],
        'x-xss-protection'          => ['name'=>'X-XSS-Protection',      'desc'=>'Protección XSS legacy (útil para navegadores antiguos).',                    'severity'=>'low'],
        'cross-origin-opener-policy'=> ['name'=>'COOP',                   'desc'=>'Aísla el contexto de navegación entre orígenes distintos.',                  'severity'=>'low'],
    ];
    $securityHeaders = [];
    foreach ($secChecks as $hk => $info) {
        $securityHeaders[] = [
            'header'   => $info['name'],
            'key'      => $hk,
            'present'  => isset($headers[$hk]),
            'value'    => $headers[$hk] ?? null,
            'desc'     => $info['desc'],
            'severity' => $info['severity'],
        ];
    }
    $missing   = count(array_filter($securityHeaders, fn($h) => !$h['present']));
    $secScore  = round((count($securityHeaders) - $missing) / count($securityHeaders) * 100);

    // ── Detección de tecnologías ────────────────────────────
    $bodyLow = strtolower($body ?? '');
    $techs   = [];
    $add = fn($n,$c,$i) => $techs[] = ['name'=>$n,'category'=>$c,'icon'=>$i];

    if (!empty($headers['server']))      $add($headers['server'],          'Servidor Web', 'fa-server');
    if (!empty($headers['x-powered-by']))$add($headers['x-powered-by'],   'Backend',      'fa-code');
    if (!empty($headers['via']))         $add('CDN/Proxy: '.$headers['via'],'CDN',        'fa-network-wired');

    // CMS
    if (str_contains($bodyLow,'wp-content')||str_contains($bodyLow,'wp-includes'))   $add('WordPress','CMS','fa-wordpress');
    if (str_contains($bodyLow,'joomla'))   $add('Joomla','CMS','fa-joomla');
    if (str_contains($bodyLow,'drupal'))   $add('Drupal','CMS','fa-drupal');
    if (str_contains($bodyLow,'shopify'))  $add('Shopify','E-Commerce','fa-bag-shopping');
    if (str_contains($bodyLow,'wix.com'))  $add('Wix','Website Builder','fa-wix');
    if (str_contains($bodyLow,'squarespace')) $add('Squarespace','Website Builder','fa-square');

    // JS Frameworks
    if (str_contains($bodyLow,'react'))    $add('React','Framework JS','fa-react');
    if (str_contains($bodyLow,'vue.js')||str_contains($bodyLow,'__vue__')) $add('Vue.js','Framework JS','fa-vuejs');
    if (str_contains($bodyLow,'angular'))  $add('Angular','Framework JS','fa-angular');
    if (str_contains($bodyLow,'jquery'))   $add('jQuery','Librería JS','fa-js');
    if (str_contains($bodyLow,'bootstrap'))$add('Bootstrap','CSS Framework','fa-bootstrap');
    if (str_contains($bodyLow,'tailwind')) $add('Tailwind CSS','CSS Framework','fa-wind');
    if (str_contains($bodyLow,'next.js')||str_contains($bodyLow,'__next')) $add('Next.js','Framework JS','fa-n');
    if (str_contains($bodyLow,'nuxt'))     $add('Nuxt.js','Framework JS','fa-n');
    if (str_contains($bodyLow,'gatsby'))   $add('Gatsby','Framework JS','fa-g');

    // CDN/Hosting
    if (str_contains($bodyLow,'cloudflare')||!empty($headers['cf-ray'])) $add('Cloudflare','CDN','fa-cloud');
    if (!empty($headers['x-amz-cf-id'])||!empty($headers['x-amzn-requestid'])) $add('AWS','Cloud','fa-aws');
    if (!empty($headers['x-azure-ref'])) $add('Azure','Cloud','fa-microsoft');
    if (str_contains($bodyLow,'googleapis.com')) $add('Google APIs','Servicios','fa-google');
    if (!empty($headers['x-vercel-id'])) $add('Vercel','Hosting','fa-v');

    // Analytics
    if (str_contains($bodyLow,'google-analytics')||str_contains($bodyLow,'gtag')) $add('Google Analytics','Analytics','fa-chart-line');
    if (str_contains($bodyLow,'gtm.js')||str_contains($bodyLow,'googletagmanager')) $add('Google Tag Manager','Analytics','fa-tags');
    if (str_contains($bodyLow,'hotjar'))   $add('Hotjar','Analytics','fa-fire');
    if (str_contains($bodyLow,'facebook.net')||str_contains($bodyLow,'fbq(')) $add('Facebook Pixel','Analytics','fa-facebook');

    // ── SSL ────────────────────────────────────────────────
    $ssl = null;
    if ($certInfo && isset($certInfo[0])) {
        $c = $certInfo[0];
        $expire = $c['Expire date'] ?? null;
        $daysLeft = $expire ? (int)((strtotime($expire) - time()) / 86400) : null;
        $ssl = [
            'subject'   => $c['Subject']      ?? 'N/A',
            'issuer'    => $c['Issuer']        ?? 'N/A',
            'validFrom' => $c['Start date']    ?? 'N/A',
            'validTo'   => $expire             ?? 'N/A',
            'daysLeft'  => $daysLeft,
            'valid'     => $daysLeft !== null && $daysLeft > 0,
        ];
    }

    // ── Información de cookies ─────────────────────────────
    $cookieFlags = [];
    if (!empty($headers['set-cookie'])) {
        $raw = $headers['set-cookie'];
        $cookieFlags['httpOnly'] = str_contains(strtolower($raw), 'httponly');
        $cookieFlags['secure']   = str_contains(strtolower($raw), 'secure');
        $cookieFlags['sameSite'] = str_contains(strtolower($raw), 'samesite');
    }

    echo json_encode([
        'url'             => $rawInput,
        'statusCode'      => $httpCode,
        'responseTimeMs'  => $respTime,
        'primaryIp'       => $primaryIp,
        'serverHeaders'   => array_intersect_key($headers, array_flip(['server','x-powered-by','content-type','cache-control','via','cf-ray'])),
        'securityHeaders' => $securityHeaders,
        'securityScore'   => $secScore,
        'technologies'    => $techs,
        'ssl'             => $ssl,
        'cookieFlags'     => $cookieFlags,
    ]);
    exit;
}

// ── ACCIÓN: subdomains  ─────────────────────────────────────
// Busca subdominios via crt.sh (Certificate Transparency).
// Llamada: GET proxy.php?action=subdomains&domain=ejemplo.com
// ────────────────────────────────────────────────────────────
if ($action === 'subdomains') {
    $domain = $_GET['domain'] ?? '';
    if (empty($domain)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dominio no proporcionado']);
        exit;
    }

    $subs = [];

    // --- Fuente 1: crt.sh ---
    $crtUrl = 'https://crt.sh/?q=%25.' . urlencode($domain) . '&output=json';
    $ch = curl_init($crtUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $resp) {
        $certs = json_decode($resp, true) ?? [];
        foreach ($certs as $cert) {
            $names = explode("\n", $cert['name_value'] ?? '');
            foreach ($names as $name) {
                $name = strtolower(trim($name));
                if ($name && str_ends_with($name, '.' . $domain) && !in_array($name, $subs)) {
                    $subs[] = $name;
                }
            }
        }
    }

    // --- Fuente 2: Subdomain Center ---
    $scUrl = 'https://api.subdomain.center/?domain=' . urlencode($domain);
    $ch = curl_init($scUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'User-Agent: Mozilla/5.0'],
    ]);
    $scResp = curl_exec($ch);
    curl_close($ch);

    if ($scResp) {
        $scData = json_decode($scResp, true) ?? [];
        if (is_array($scData)) {
            foreach ($scData as $sub) {
                $sub = strtolower(trim($sub));
                if ($sub && str_ends_with($sub, '.' . $domain) && !in_array($sub, $subs)) {
                    $subs[] = $sub;
                }
            }
        }
    }

    // --- Fuente 3: HackerTarget ---
    $htUrl = 'https://api.hackertarget.com/hostsearch/?q=' . urlencode($domain);
    $ch = curl_init($htUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $htResp = curl_exec($ch);
    curl_close($ch);

    if ($htResp && !str_contains($htResp, "API count exceeded") && !str_contains($htResp, "error")) {
        $lines = explode("\n", $htResp);
        foreach ($lines as $line) {
            $parts = explode(",", $line);
            if (!empty($parts[0])) {
                $name = strtolower(trim($parts[0]));
                if ($name && str_ends_with($name, '.' . $domain) && $name !== $domain && !in_array($name, $subs)) {
                    $subs[] = $name;
                }
            }
        }
    }

    sort($subs);
    echo json_encode(['domain' => $domain, 'subdomains' => $subs, 'count' => count($subs)]);
    exit;
}

// ── ACCIÓN: observatory  ────────────────────────────────────
// Consulta la API de Mozilla Observatory desde el servidor para evitar CORS del navegador.
// Llamada: GET proxy.php?action=observatory&domain=ejemplo.com
// ────────────────────────────────────────────────────────────
if ($action === 'observatory') {
    $domain = $_GET['domain'] ?? '';
    if (empty($domain)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dominio no proporcionado']);
        exit;
    }

    // Trigger rescan
    $ch = curl_init("https://observatory.mozilla.org/api/v1/analyze/?host=" . urlencode($domain) . "&hidden=true&rescan=false");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    curl_exec($ch);
    curl_close($ch);

    usleep(1500000); // esperar 1.5 segundos a que analice

    // Obtener resultados principales
    $ch = curl_init("https://observatory.mozilla.org/api/v1/analyze/?host=" . urlencode($domain));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($res, true);
    if ($data && isset($data['scan_id'])) {
        // Obtener detalles del test
        $ch = curl_init("https://observatory.mozilla.org/api/v1/getScanResults?scan=" . $data['scan_id']);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $testsRes = curl_exec($ch);
        curl_close($ch);
        $data['tests'] = json_decode($testsRes, true) ?? new stdClass();
    }

    echo json_encode($data ?? ['error' => 'No se pudo obtener respuesta de Observatory']);
    exit;
}

// ── ACCIÓN: ports  ──────────────────────────────────────────
// Escanea puertos comunes de un dominio/IP usando fsockopen().
// Llamada: GET proxy.php?action=ports&domain=ejemplo.com
// ────────────────────────────────────────────────────────────
if ($action === 'ports') {
    $host = $_GET['domain'] ?? '';
    if (empty($host)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dominio o IP no proporcionado']);
        exit;
    }
    $host = preg_replace('/^https?:\/\//i', '', $host);
    $host = explode('/', $host)[0];

    // puerto => [servicio, riesgo, descripción]
    $PORTS = [
        21   => ['FTP',           'high',   'Transferencia de archivos en texto plano'],
        22   => ['SSH',           'medium', 'Acceso remoto seguro'],
        23   => ['Telnet',        'high',   'Acceso remoto SIN cifrado — obsoleto'],
        25   => ['SMTP',          'medium', 'Envío de correo electrónico'],
        53   => ['DNS',           'low',    'Servidor de nombres de dominio'],
        80   => ['HTTP',          'low',    'Servidor web sin cifrado'],
        110  => ['POP3',          'medium', 'Recepción de correo (texto plano)'],
        143  => ['IMAP',          'medium', 'Acceso a correo (texto plano)'],
        443  => ['HTTPS',         'low',    'Servidor web cifrado (TLS/SSL)'],
        445  => ['SMB/CIFS',      'high',   'Compartición de archivos Windows — alto riesgo'],
        3306 => ['MySQL',         'high',   'Base de datos MySQL — no debería ser pública'],
        3389 => ['RDP',           'high',   'Escritorio remoto Windows — objetivo frecuente'],
        5432 => ['PostgreSQL',    'high',   'Base de datos PostgreSQL — no debería ser pública'],
        6379 => ['Redis',         'high',   'Redis — sin autenticación por defecto'],
        8080 => ['HTTP-Alt',      'medium', 'Puerto HTTP alternativo / panel de administración'],
        8443 => ['HTTPS-Alt',     'low',    'Puerto HTTPS alternativo'],
        9200 => ['Elasticsearch', 'high',   'Elasticsearch — sin auth en versiones antiguas'],
        27017=> ['MongoDB',       'high',   'MongoDB — frecuentemente expuesto sin autenticación'],
    ];

    $results = [];
    foreach ($PORTS as $port => [$service, $risk, $desc]) {
        $errno  = 0;
        $errstr = '';
        $conn = @fsockopen($host, $port, $errno, $errstr, 2);
        $open = ($conn !== false);
        if ($conn) fclose($conn);
        $results[] = [
            'port'    => $port,
            'service' => $service,
            'open'    => $open,
            'risk'    => $risk,
            'desc'    => $desc,
        ];
    }

    $openCount = count(array_filter($results, fn($r) => $r['open']));
    echo json_encode([
        'host'      => $host,
        'scanned'   => count($results),
        'openCount' => $openCount,
        'ports'     => $results,
    ]);
    exit;
}

// ── ACCIÓN: groq (por defecto)  ────────────────────────────
// Proxy para Groq Vision API.
// Llamada: POST proxy.php  (o POST proxy.php?action=groq)
// ────────────────────────────────────────────────────────────
if (GROQ_API_KEY === 'TU_CLAVE_API_AQUÍ' || empty(GROQ_API_KEY)) {
    http_response_code(400);
    echo json_encode(["error" => ["message" => "La clave API de Groq no está configurada en el servidor (proxy.php)"]]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => ["message" => "Método no permitido. Usa POST"]]);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input     = json_decode($inputJSON, true);

if (!isset($input['image'])) {
    http_response_code(400);
    echo json_encode(["error" => ["message" => "Falta el campo 'image' con el formato Base64 Data URL"]]);
    exit;
}

$base64Image = $input['image'];

$url     = 'https://api.groq.com/openai/v1/chat/completions';
$headers = [
    'Authorization: Bearer ' . GROQ_API_KEY,
    'Content-Type: application/json'
];

$payload = [
    'model'    => 'meta-llama/llama-4-scout-17b-16e-instruct',
    'messages' => [[
        'role'    => 'user',
        'content' => [[
            'type' => 'text',
            'text' => 'Eres un experto en geolocalización visual y OSINT (inteligencia de fuentes abiertas). Analiza minuciosamente los detalles de esta foto (monumentos conocidos como la Alhambra u otros, arquitectura, vegetación, postes, marcas viales, matrículas, letreros, geología) e intenta identificar monumentos, edificios o accidentes geográficos específicos para precisar la ciudad o punto exacto de la toma. Explica tus deducciones paso a paso de forma clara y estructurada en español y concluye con la localización exacta estimada.'
        ], [
            'type'      => 'image_url',
            'image_url' => ['url' => $base64Image]
        ]]
    ]],
    'temperature' => 0.2,
    'max_tokens'  => 1024
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => ["message" => "Error en la petición cURL del servidor: " . curl_error($ch)]]);
    exit;
}

curl_close($ch);
http_response_code($httpCode);
echo $response;
?>
