// ─── auth.js — incluir en todas las páginas ───────────────────────────────────

const Auth = {

    // Obtener token
    getToken() {
        return localStorage.getItem('token');
    },

    // Obtener usuario
    getUsuario() {
        const u = localStorage.getItem('usuario');
        return u ? JSON.parse(u) : null;
    },

    // Guardar sesión
    guardar(token, usuario) {
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
    },

    // Cerrar sesión
    cerrar() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    },

    // Verificar sesión y rol
    requerir(...rolesPermitidos) {
        const token   = this.getToken();
        const usuario = this.getUsuario();

        if (!token || !usuario) {
            window.location.href = 'login.html';
            return false;
        }

        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
            // Redirigir a la página correcta según su rol
            window.location.href = this.paginaPorRol(usuario.rol);
            return false;
        }

        return usuario;
    },

    // Página de inicio según rol
    paginaPorRol(rol) {
        switch (rol) {
            case 'gerente':
            case 'administrador': return 'vision.html';
            case 'mesero':        return 'nuevo-pedido.html';
            case 'cocinero':      return 'cocina.html';
            default:              return 'login.html';
        }
    },

    // Headers con token para fetch
    headers() {
        return {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    },

    // Fetch autenticado
    async fetch(url, opciones = {}) {
        const res = await fetch(url, {
            ...opciones,
            headers: { ...this.headers(), ...(opciones.headers || {}) }
        });

        // Si el token expiró
        if (res.status === 401) {
            this.cerrar();
            return null;
        }

        return res.json();
    },

    // Mostrar nombre de usuario en el header
    mostrarUsuario() {
        const usuario = this.getUsuario();
        if (!usuario) return;

        const elNombre = document.getElementById('nombre-header');
        const elRol    = document.getElementById('rol-header');

        if (elNombre) elNombre.textContent = usuario.nombre;
        if (elRol)    elRol.textContent    = this.nombreRol(usuario.rol);
    },

    nombreRol(rol) {
        const nombres = {
            gerente:       'Gerente',
            administrador: 'Administrador',
            mesero:        'Mesero',
            cocinero:      'Cocinero'
        };
        return nombres[rol] || rol;
    }
};

// ─── WEBSOCKET — notificaciones en tiempo real ────────────────────────────────
const Notif = {
    ws:       null,
    sonido:   null,
    handlers: {},

    conectar() {
        const token = Auth.getToken();
        if (!token) return;

        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${proto}//${location.host}`);

        this.ws.onopen = () => {
            // Identificarse con el servidor
            this.ws.send(JSON.stringify({ tipo: 'identificar', token }));
        };

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                this.manejar(data);
            } catch { /* ignorar */ }
        };

        this.ws.onclose = () => {
            // Reconectar en 3 segundos
            setTimeout(() => this.conectar(), 3000);
        };

        // Preparar sonido
        this.sonido = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2tGR3Wl2NXCnHNsdZSruaaQdWhwd4unuK+feWlsd4imtq2jj3drcHqNpbiyp5N8bW93i6O2saaVgXBxeI2jtrKmloJ0cHiMorWxppaBdHF5jaK0sKWXg3Vxeo6hs66klYJ1cnuPorOup5WFdnN8kKOzrKaXh3h0fo+is6unm4l6dn2QobKqqJuKeHh+kqGxqaidjXp5f5Ohr6mnno97e4GVoK+np6CPfX2Cl6CupaehkX9/hZmfraSmopOBgYebnKyjpqOVhIOJnpusoqWilYaFi5+arKKkoZaIh42hmauho6CYiomQopmqoKSemoyLkqSYqZ+lnZuOjZWml6idpp+djpCYp5annJ+dmZCRmqiWqJunm5WOEJ2nlKeaqJmTlZOeqJWmm6makoaUoKeVpZqomZKGlKCmlaSZqZiQhZSgpZSlmqiXjoSVoKSUo5moloqEmJ+jk6KaqJaJhJmeoo+gnaqUiIeanqGMnquplIeDmZyeiZyqqZSIhZucnoiaqquVioianpyGmaurlZCMip2ch5aqrJeOkYyenYSVq6yYkJKOnp2CkqysmZGUj5+dgo+srpqTlpCgnX+Nra2clZeRoZ1/i62snZaYkqKcfo2trZ2WmJOjm32Lra2dlpmUpJp8iq2tnZeakqWZe4itrZ2YmZOmmXqHra2dmZqUppl5hq2tnZmblZemengEnQAA');
    },

    manejar(data) {
        // Llamar al handler registrado
        if (this.handlers[data.tipo]) {
            this.handlers[data.tipo](data);
        }

        // Mostrar notificación visual
        this.mostrar(data.mensaje, data.tipo);
    },

    on(tipo, fn) {
        this.handlers[tipo] = fn;
    },

    mostrar(mensaje, tipo) {
        // Reproducir sonido
        if (this.sonido) {
            this.sonido.currentTime = 0;
            this.sonido.play().catch(() => {});
        }

        // Crear notificación visual
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${tipo === 'pedido-listo' ? '#22c55e' : '#3b82f6'};
            color: white; padding: 14px 20px; border-radius: 16px;
            font-family: Poppins, sans-serif; font-size: 0.9rem; font-weight: 600;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            max-width: 320px; cursor: pointer;
        `;
        div.textContent = mensaje;
        div.onclick = () => div.remove();

        // Animación
        const style = document.createElement('style');
        style.textContent = `@keyframes slideIn { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }`;
        document.head.appendChild(style);

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
};