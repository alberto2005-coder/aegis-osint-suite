# Guia de Pruebas de Aegis OSINT Suite

Esta guia detalla como verificar cada una de las nuevas caracteristicas y correcciones implementadas en la plataforma.

---

## 1. Cifrado y Esteganografia (Crypto Box)

### Prueba A: Cifrado de Texto Directo
1. Ve a la pestaña **Cifrado / Descifrado**.
2. Asegurate de que **Medio / Canal** este en `Texto Directo` y **Operacion** en `Cifrar Mensaje`.
3. Selecciona un algoritmo (ej. `AES-GCM` o `RC4`) e ingresa la clave secreta `secreto123`.
4. En **Mensaje de Entrada**, escribe `Este es un mensaje confidencial`.
5. Haz clic en **Procesar**. El resultado aparecera en la derecha en formato cifrado (Base64 para AES, Hex para el resto).
6. Haz clic en **Copiar**.
7. Cambia **Operacion** a `Descifrar Mensaje`, pega el texto en la izquierda, y procesa usando la misma clave y algoritmo para recuperarlo.
8. Modifica la clave a `secreto124` y procesa. Verifica que se muestra un mensaje de error indicando que los datos o clave son incorrectos.

### Prueba B: Esteganografia en Imagen (Mensaje Oculto)
1. Cambia **Medio / Canal** a `Ocultar en Imagen (Esteganografia)`.
2. Sube cualquier imagen (JPG o PNG) arrastrandola al dropzone o haciendo clic en el.
3. En **Mensaje de Entrada** escribe `Claves de acceso de respaldo`.
4. Define el algoritmo (ej. `RC4`) y la clave `llaveprivada`.
5. Haz clic en **Procesar**. El sistema cifrara el mensaje e insertara los bits en los pixeles de la imagen de forma imperceptible.
6. Haz clic en el boton verde **Descargar Imagen Cifrada (PNG)**.
7. Cambia **Operacion** a `Descifrar Mensaje`.
8. Arrastra al dropzone la imagen PNG que acabas de descargar.
9. Ingresa la clave `llaveprivada` y el algoritmo `RC4` y presiona **Procesar**. Veras el mensaje original descifrado.

---

## 2. Auditoria Web e Informe PDF

1. Ve a la pestaña **Auditoria Web**.
2. Introduce un dominio publico (ej. `github.com` o `google.com`) y haz clic en **Auditar**.
3. **Verificaciones visuales**:
   * El mapa interactivo debe cargarse arriba mostrando la ubicacion fisica del hosting de la IP.
   * La lista de tecnologías, certificados SSL, subdominios y puertos comunes debe poblarse.
4. **Verificacion de PDF**:
   * Haz clic en **Exportar Reporte (PDF)**.
   * Abre el archivo descargado y verifica que contiene todas las tablas formateadas con el diseño institucional.

---

## 3. Analizador de Cabeceras SMTP (Email Path)

1. En tu correo (ej. Gmail), abre cualquier email, haz clic en los tres puntos (Mas) y selecciona **Mostrar original**.
2. Copia todo el bloque de texto de cabeceras tecnicas.
3. Abre Aegis OSINT y ve a la pestaña **Cabeceras Email**.
4. Pega las cabeceras en el campo de texto y haz clic en **Analizar**.
5. **Verificaciones**:
   * El mapa del mundo debe dibujar la trayectoria de los saltos geograficos del email.
   * En la seccion de saltos, debe dibujarse una **linea de tiempo vertical de nodos** en lugar de una lista plana. El primer nodo (origen) debe aparecer en rojo, los intermedios en cian y el final en verde.
   * Cada nodo debe incluir un enlace directo a `ipinfo.io` si tiene IP detectada.

---

## 4. Control de Procesos y RAM en Sherlock

Para comprobar que el servidor no acumula consumo de memoria RAM:
1. Ve a la pestaña **Usuarios (Sherlock)**.
2. Ingresa un nombre de usuario y presiona **Escanear**.
3. Mientras se realiza la busqueda, cierra la pestaña del navegador o presiona F5 para recargar la pagina.
4. Revisa la consola del servidor Node.js. Veras que el proceso de Sherlock en segundo plano es terminado de forma inmediata al desconectarse el cliente, liberando la memoria.

---

## 5. Visualizacion de Menu Lateral

1. Reduce la altura de la ventana de tu navegador (o usa las herramientas de desarrollador F12 para emular una pantalla pequeña).
2. Coloca el cursor sobre la barra de navegacion lateral.
3. Comprueba que ahora puedes hacer scroll vertical con la rueda del raton sobre los botones de las herramientas, permitiendote llegar a **Cifrado / Descifrado** sin que quede cortado.
