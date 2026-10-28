document.addEventListener('DOMContentLoaded', () => {
  // --- 10. LINUX CHEAT SHEET & COMMANDS LOGIC ---
  const btnGenerateLinux = document.getElementById('btn-generate-linux');
  const linuxTool = document.getElementById('linux-tool');
  const linuxTarget = document.getElementById('linux-target');
  const linuxPreviewBox = document.getElementById('linux-preview-box');
  const linuxInstallCode = document.getElementById('linux-install-code');
  const linuxRunCode = document.getElementById('linux-run-code');

  const btnCopyLinuxInstall = document.getElementById('btn-copy-linux-install');
  const btnCopyLinuxRun = document.getElementById('btn-copy-linux-run');

  const LINUX_COMMANDS = {
    // --- Pentesting Web Ético (Recon/Crawling) ---
    gospider: {
      placeholder: 'Ej. https://dominio.com',
      install: 'go install github.com/jaeles-project/gospider@latest',
      run: 'gospider -s {target} --depth 3 --no-redirect -t 10 -c 10'
    },
    hakrawler: {
      placeholder: 'Ej. https://dominio.com',
      install: 'go install github.com/hakluke/hakrawler@latest',
      run: 'echo {target} | hakrawler -plain -depth 2'
    },
    subjs: {
      placeholder: 'Ej. lista de hosts vivos (alive.txt con httpx)',
      install: 'go install github.com/lc/subjs@latest',
      run: 'cat alive.txt | subjs'
    },
    linkfinder: {
      placeholder: 'Ej. https://dominio.com/app.js',
      install: 'git clone https://github.com/GerbenJavado/LinkFinder.git && cd LinkFinder && pip3 install -r requirements.txt',
      run: 'python3 linkfinder.py -i {target} -o cli'
    },
    sherlock: {
      placeholder: 'Ej. nombre_usuario (ej: john_doe)',
      install: 'pipx install sherlock-project  # o: pip install sherlock-project\n# Comprobar version: sherlock --version',
      run: 'sherlock {target}'
    },
    phoneinfoga: {
      placeholder: 'Ej. +34600000000 (número con prefijo de país)',
      install: 'go install github.com/sundowndev/phoneinfoga/v2@latest\n# o descargar binario desde releases',
      run: 'phoneinfoga scan -n {target}'
    },
    theharvester: {
      placeholder: 'Ej. dominio.com (ej: google.com)',
      install: 'pipx install theHarvester  # o: pip install theHarvester',
      run: 'theHarvester -d {target} -l 500 -b anubis,crtsh,rapiddns,urlscan'
    },
    ghunt: {
      placeholder: 'Ej. correo@gmail.com (cuenta de Google)',
      install: 'pipx install ghunt',
      run: 'ghunt email {target}'
    },
    dnsrecon: {
      placeholder: 'Ej. dominio.com (ej: example.com)',
      install: 'pipx install dnsrecon  # o: sudo apt install dnsrecon',
      run: 'dnsrecon -d {target}'
    },
    socialscan: {
      placeholder: 'Ej. nombre_usuario o correo@ejemplo.com',
      install: 'pipx install socialscan  # o: pip install socialscan',
      run: 'socialscan {target}'
    },
    holehe: {
      placeholder: 'Ej. correo@ejemplo.com (para escanear en RRSS)',
      install: 'pipx install holehe  # o: pip install holehe',
      run: 'holehe {target}'
    },
    nmap: {
      placeholder: 'Ej. 192.168.1.1 o dominio.com',
      install: 'sudo apt update && sudo apt install nmap  # Kali/Debian/Ubuntu',
      run: 'nmap -sS -sV -T4 {target}'
    },
    whois: {
      placeholder: 'Ej. dominio.com o dirección IP',
      install: 'sudo apt update && sudo apt install whois',
      run: 'whois {target}'
    },
    whatweb: {
      placeholder: 'Ej. https://dominio.com o dominio.com',
      install: 'sudo apt update && sudo apt install whatweb',
      run: 'whatweb -a 3 {target}'
    },
    nikto: {
      placeholder: 'Ej. https://dominio.com o dirección IP',
      install: 'sudo apt update && sudo apt install nikto',
      run: 'nikto -h {target}'
    },
    // --- Subdominios / Assets ---
    subfinder: {
      placeholder: 'Ej. dominio.com',
      install: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      run: 'subfinder -d {target} -silent'
    },
    assetfinder: {
      placeholder: 'Ej. dominio.com',
      install: 'go install github.com/tomnomnom/assetfinder@latest',
      run: 'assetfinder --subs-only {target}'
    },
    findomain: {
      placeholder: 'Ej. dominio.com',
      install: 'curl -LO https://github.com/findomain/findomain/releases/latest/download/findomain-linux.zip && unzip findomain-linux.zip && sudo mv findomain /usr/local/bin/',
      run: 'findomain -t {target} --quiet'
    },
    amass: {
      placeholder: 'Ej. dominio.com',
      install: 'go install -v github.com/owasp-amass/amass/v4/...@master',
      run: 'amass enum -passive -d {target}'
    },
    // --- Web Recon ---
    httpx: {
      placeholder: 'Ej. dominios.txt o dominio.com',
      install: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
      run: 'echo {target} | httpx -silent -title -status-code -tech-detect'
    },
    httprobe: {
      placeholder: 'Ej. lista de subdominios (usar archivo)',
      install: 'go install github.com/tomnomnom/httprobe@latest',
      run: 'cat subdomains.txt | httprobe'
    },
    naabu: {
      placeholder: 'Ej. dominio.com o IP',
      install: 'go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest',
      run: 'naabu -host {target} -top-ports 1000'
    },
    // --- Fuzzing / Crawling ---
    ffuf: {
      placeholder: 'Ej. https://dominio.com/FUZZ',
      install: 'go install github.com/ffuf/ffuf/v2@latest',
      run: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u {target}'
    },
    feroxbuster: {
      placeholder: 'Ej. https://dominio.com',
      install: 'curl -sL https://raw.githubusercontent.com/epi052/feroxbuster/main/install-nix.sh | bash',
      run: 'feroxbuster -u {target} -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt'
    },
    gobuster: {
      placeholder: 'Ej. https://dominio.com',
      install: 'go install github.com/OJ/gobuster/v3@latest',
      run: 'gobuster dir -u {target} -w /usr/share/wordlists/dirb/common.txt'
    },
    katana: {
      placeholder: 'Ej. https://dominio.com',
      install: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
      run: 'katana -u {target} -silent'
    },
    // --- URLs históricas / DNS ---
    gau: {
      placeholder: 'Ej. dominio.com',
      install: 'go install github.com/lc/gau/v2/cmd/gau@latest',
      run: 'gau --subs {target}'
    },
    waybackurls: {
      placeholder: 'Ej. dominio.com',
      install: 'go install github.com/tomnomnom/waybackurls@latest',
      run: 'echo {target} | waybackurls'
    },
    dnsx: {
      placeholder: 'Ej. dominio.com (o lista)',
      install: 'go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest',
      run: 'echo {target} | dnsx -silent -a -cname'
    },
    puredns: {
      placeholder: 'Ej. dominio.com',
      install: 'go install github.com/d3mondev/puredns/v2@latest',
      run: 'echo {target} | puredns resolve --resolvers /etc/resolvers.txt'
    },
    // --- Scanning con plantillas (ÉTICO) ---
    nuclei: {
      placeholder: 'Ej. https://dominio.com (SOLO con autorización)',
      install: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      run: 'nuclei -u {target} -silent -severity critical,high'
    },
    uncover: {
      placeholder: 'Ej. dominio.com (requiere API keys)',
      install: 'go install -v github.com/projectdiscovery/uncover/cmd/uncover@latest',
      run: 'uncover -q {target} -e shodan,censys,fofa'
    }
  };

  if (linuxTool && linuxTarget) {
    // Update placeholder on selection change
    linuxTool.addEventListener('change', () => {
      const tool = linuxTool.value;
      if (LINUX_COMMANDS[tool]) {
        linuxTarget.placeholder = LINUX_COMMANDS[tool].placeholder;
      }
      if (tool === 'nuclei') {
        if (typeof window.showToast === 'function') {
          window.showToast('ADVERTENCIA: Nuclei es un escáner de vulnerabilidades. Úsalo ÚNICAMENTE con autorización explícita y por escrito.', 'warning');
        }
      }
    });

    // Set initial placeholder
    if (LINUX_COMMANDS[linuxTool.value]) {
      linuxTarget.placeholder = LINUX_COMMANDS[linuxTool.value].placeholder;
    }
  }

  if (btnGenerateLinux) {
    btnGenerateLinux.addEventListener('click', () => {
      const target = linuxTarget.value.trim();
      if (!target) {
        window.showToast("Por favor introduce un target (usuario, dominio, email o teléfono).", "warning");
        return;
      }

      const tool = linuxTool.value;
      const data = LINUX_COMMANDS[tool];

      linuxInstallCode.textContent = data.install;
      linuxRunCode.textContent = data.run.replace('{target}', target);
      linuxPreviewBox.style.display = 'block';
    });
  }

  const setupCopyBtn = (btn, codeElem) => {
    if (btn && codeElem) {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeElem.textContent).then(() => {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 1500);
        });
      });
    }
  };

  setupCopyBtn(btnCopyLinuxInstall, linuxInstallCode);
  setupCopyBtn(btnCopyLinuxRun, linuxRunCode);
});
