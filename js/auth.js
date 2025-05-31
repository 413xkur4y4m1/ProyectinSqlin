// Firebase Authentication Utilities

// Función para verificar si es una ruta que requiere autenticación
function requiresAuth() {
    const path = window.location.pathname;
    const protectedPages = [
        'prestamos.html',
        'lista-prestamos.html',
        'lista-adeudos.html'
    ];
    return protectedPages.some(page => path.endsWith(page));
}

// Función para verificar el estado de autenticación
function checkAuth() {
    // No requerir autenticación para páginas públicas
    if (!requiresAuth()) {
        return true;
    }

    // Verificar autenticación
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe(); // Dejar de escuchar después de la primera verificación
            if (!user && requiresAuth()) {
                window.location.href = 'sistema-prestamos.html';
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Manejar el envío del formulario de inicio de sesión
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }
    
    const matricula = document.getElementById('loginMatricula')?.value;
    const password = document.getElementById('loginPassword')?.value;

    if (!matricula || !password) {
        mostrarEstado('Por favor ingrese matrícula y contraseña', 'error');
        return;
    }

    try {
        mostrarEstado('Iniciando sesión...', 'loading');
        // Primero verificar si el usuario existe en la base de datos
        const userSnapshot = await firebase.database()
            .ref('alumno')
            .orderByChild('matricula')
            .equalTo(parseInt(matricula))
            .once('value');

        if (!userSnapshot.exists()) {
            mostrarEstado('Usuario no encontrado. Por favor regístrese primero.', 'error');
            return;
        }

        const result = await firebase.auth().signInWithEmailAndPassword(
            `${matricula}@ulsa.mx`,
            password
        );
        
        if (result.user) {
            // Actualizar estado de autenticación en localStorage
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('userMatricula', matricula);
            
            // Redirigir después de un breve retraso
            setTimeout(() => {
                window.location.href = 'prestamos.html';
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Formato de matrícula inválido';
        }
        mostrarEstado(errorMessage, 'error');
    }
}

// Manejar registro de nuevo usuario
async function handleRegister(event) {
    if (event) {
        event.preventDefault();
    }

    const nombre = document.getElementById('nombre')?.value;
    const apellido_p = document.getElementById('apellido_p')?.value;
    const apellido_m = document.getElementById('apellido_m')?.value;
    const matricula = document.getElementById('matricula')?.value;
    const correo = document.getElementById('correo')?.value;
    const password = document.getElementById('password')?.value;

    if (!nombre || !apellido_p || !apellido_m || !matricula || !correo || !password) {
        mostrarEstado('Por favor complete todos los campos', 'error');
        return;
    }

    try {
        mostrarEstado('Registrando usuario...', 'loading');

        // Crear usuario en Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            correo,
            password
        );

        // Guardar datos adicionales en Realtime Database
        const userData = {
            nombre: nombre,
            apellido_p: apellido_p,
            apellido_m: apellido_m,
            matricula: matricula,
            correo: correo,
            fecha_registro: new Date().toISOString()
        };

        await firebase.database().ref('alumno/' + matricula).set(userData);
        mostrarEstado('¡Registro exitoso!', 'success');
        
        // Redirigir después de un registro exitoso
        setTimeout(() => {
            window.location.href = 'prestamos.html';
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        mostrarEstado('Error al registrar: ' + error.message, 'error');
    }
}

// Manejar inicio de sesión con Microsoft
async function handleMicrosoftSignIn() {
    try {
        mostrarEstado('Iniciando sesión con Microsoft...', 'loading');
        const provider = new firebase.auth.OAuthProvider('microsoft.com');
        
        provider.setCustomParameters({
            tenant: 'common',
            prompt: 'select_account'
        });

        provider.addScope('profile');
        provider.addScope('email');

        const result = await firebase.auth().signInWithPopup(provider);
        if (result.user) {
            window.location.href = 'prestamos.html';
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarEstado('Error al iniciar sesión con Microsoft: ' + error.message, 'error');
    }
}

// Manejar cierre de sesión
async function handleSignOut() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Mostrar mensajes de estado
function mostrarEstado(mensaje, tipo) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.className = 'status ' + tipo;
        statusDiv.textContent = mensaje;
        statusDiv.style.display = 'block';
    }
}

// Escuchar cambios en el estado de autenticación
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        if (window.location.pathname.endsWith('sistema-prestamos.html')) {
            window.location.href = 'prestamos.html';
        }
    } else if (requiresAuth()) {
        window.location.href = 'sistema-prestamos.html';
    }
});

// Verificar autenticación al cargar la página
window.addEventListener('load', checkAuth);

// Export functions
window.handleMicrosoftSignIn = handleMicrosoftSignIn;
window.handleSignOut = handleSignOut;
