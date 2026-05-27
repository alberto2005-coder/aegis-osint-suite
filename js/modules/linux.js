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
    sherlock: {
      placeholder: 'Ej. nombre_usuario (ej: john_doe)',
      install: 'git clone https://github.com/sherlock-project/sherlock.git && cd sherlock && python3 -m pip install -r requirements.txt',
      run: 'python3 sherlock.py {target}'
    },
    phoneinfoga: {
      placeholder: 'Ej. +34600000000 (número con prefijo de país)',
      install: 'curl -sSL https://raw.githubusercontent.com/sundowndev/phoneinfoga/master/support/scripts/install | bash',
      run: './phoneinfoga scan -n {target}'
    },
    theharvester: {
      placeholder: 'Ej. dominio.com (ej: google.com)',
      install: 'sudo apt update && sudo apt install theharvester',
      run: 'theHarvester -d {target} -l 500 -b google,bing,crtsh'
    },
    ghunt: {
      placeholder: 'Ej. correo@gmail.com (cuenta de Google)',
      install: 'pipx install ghunt   # Requiere pipx instalado',
      run: 'ghunt email {target}'
    },
    dnsrecon: {
      placeholder: 'Ej. dominio.com (ej: example.com)',
      install: 'sudo apt update && sudo apt install dnsrecon',
      run: 'dnsrecon -d {target}'
    },
    socialscan: {
      placeholder: 'Ej. nombre_usuario o correo@ejemplo.com',
      install: 'pip3 install socialscan',
      run: 'socialscan {target}'
    },
    holehe: {
      placeholder: 'Ej. correo@ejemplo.com (para escanear en RRSS)',
      install: 'pip3 install holehe',
      run: 'holehe {target}'
    },
    nmap: {
      placeholder: 'Ej. 192.168.1.1 o dominio.com',
      install: 'sudo apt update && sudo apt install nmap',
      run: 'nmap -A -T4 {target}'
    },
    whois: {
      placeholder: 'Ej. dominio.com o dirección IP',
      install: 'sudo apt update && sudo apt install whois',
      run: 'whois {target}'
    },
    whatweb: {
      placeholder: 'Ej. https://dominio.com o dominio.com',
      install: 'sudo apt update && sudo apt install whatweb',
      run: 'whatweb {target}'
    },
    nikto: {
      placeholder: 'Ej. https://dominio.com o dirección IP',
      install: 'sudo apt update && sudo apt install nikto',
      run: 'nikto -h {target}'
    }
  };

  if (linuxTool && linuxTarget) {
    // Update placeholder on selection change
    linuxTool.addEventListener('change', () => {
      const tool = linuxTool.value;
      if (LINUX_COMMANDS[tool]) {
        linuxTarget.placeholder = LINUX_COMMANDS[tool].placeholder;
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
        alert("Por favor introduce un target (usuario, dominio, email o teléfono).");
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
