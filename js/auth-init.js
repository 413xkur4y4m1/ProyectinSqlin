// Manejo centralizado de autenticación y navegación
firebase.auth().onAuthStateChanged(async (user) => {
    // Obtener la página actual
    const currentPath = window.location.pathname;
    
    if (user) {
        // Usuario autenticado
        if (currentPath.endsWith('sistema-prestamos.html')) {
            // Si está en la página de login y está autenticado, redirigir a préstamos
            window.location.href = 'prestamos.html';
        } else if (requiresAuth()) {
            // Si está en una página protegida, verificar que el usuario exista en la base de datos
            try {
                const userSnapshot = await firebase.database()
                    .ref('alumno')
                    .orderByChild('correo')
                    .equalTo(user.email)
                    .once('value');

                if (!userSnapshot.exists()) {
                    // Si el usuario no existe en la base de datos, cerrar sesión
                    await firebase.auth().signOut();
                    window.location.href = 'sistema-prestamos.html';
                }
            } catch (error) {
                console.error('Error al verificar usuario:', error);
            }
        }
    } else {
        // Usuario no autenticado
        if (requiresAuth()) {
            // Si intenta acceder a una página protegida, redirigir al login
            const currentUrl = window.location.href;
            const returnUrl = encodeURIComponent(currentUrl);
            window.location.href = `sistema-prestamos.html?returnTo=${returnUrl}`;
        }
    }
});
