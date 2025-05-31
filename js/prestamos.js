// Firebase Auth and Database integration
let currentUser = null;

// Auth state observer
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;        document.getElementById('login').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.querySelector('.form-content').style.display = 'block';
        document.getElementById('userName').textContent = user.displayName || user.email;
        document.getElementById('userEmail').textContent = user.email;
        cargarMateriales();
    } else {
        document.getElementById('login').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('formPrestamo').style.display = 'none';
        document.getElementById('qrContainer').style.display = 'none';
    }
});

// Función para mostrar mensajes de estado
function mostrarEstado(mensaje, tipo) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = mensaje;
    statusDiv.className = 'status ' + tipo;
    statusDiv.style.display = 'block';

    if (tipo !== 'loading') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Iniciar sesión con correo y contraseña
async function iniciarSesion() {
    const matricula = document.getElementById('loginMatricula').value;
    const password = document.getElementById('loginPassword').value;

    if (!matricula || !password) {
        mostrarEstado('Por favor ingrese matrícula y contraseña', 'error');
        return;
    }

    try {
        mostrarEstado('Iniciando sesión...', 'loading');
        const userCredential = await firebase.auth().signInWithEmailAndPassword(
            `${matricula}@ulsa.mx`,
            password
        );
        
        // Verificar si el usuario existe en la base de datos
        const snapshot = await firebase.database()
            .ref('alumno')
            .orderByChild('matricula')
            .equalTo(parseInt(matricula))
            .once('value');

        if (!snapshot.exists()) {
            mostrarEstado('Usuario no encontrado', 'error');
            return;
        }

        window.location.href = 'prestamos.html';
    } catch (error) {
        console.error('Error:', error);
        mostrarEstado('Error al iniciar sesión: ' + error.message, 'error');
    }
}

// Iniciar sesión con Microsoft
async function iniciarSesionMicrosoft() {
    try {
        mostrarEstado('Iniciando sesión con Microsoft...', 'loading');
        const provider = new firebase.auth.OAuthProvider('microsoft.com');
        provider.setCustomParameters({
            tenant: 'common',
            prompt: 'select_account'
        });

        const result = await firebase.auth().signInWithPopup(provider);
        currentUser = result.user;
        
        // Check if user exists in database
        const userSnapshot = await firebase.database()
            .ref('alumno')
            .orderByChild('correo')
            .equalTo(result.user.email)
            .once('value');

        if (!userSnapshot.exists()) {
            mostrarEstado('Usuario no encontrado. Por favor regístrese primero.', 'error');
            return;
        }

        window.location.href = 'prestamos.html';
    } catch (error) {
        console.error('Error:', error);
        mostrarEstado('Error al iniciar sesión: ' + error.message, 'error');
    }
}

// Registrar nuevo usuario
async function registrar() {
    const nombre = document.getElementById('nombre').value;
    const apellido_p = document.getElementById('apellido_p').value;
    const apellido_m = document.getElementById('apellido_m').value;
    const matricula = document.getElementById('matricula').value;
    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    if (!nombre || !apellido_p || !matricula || !correo || !password) {
        mostrarEstado('Por favor complete todos los campos requeridos', 'error');
        return;
    }

    try {
        mostrarEstado('Registrando usuario...', 'loading');
        
        // Crear usuario en Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            correo,
            password
        );

        // Guardar información adicional en la base de datos
        const userData = {
            matricula: parseInt(matricula),
            nombre,
            apellido_p,
            apellido_m,
            correo,
            tipo_usuario: 'alumno',
            fecha_registro: new Date().toISOString()
        };

        await firebase.database().ref('alumno/' + matricula).set(userData);
        mostrarEstado('¡Registro exitoso!', 'success');
        
        // Redirigir a préstamos
        window.location.href = 'prestamos.html';
    } catch (error) {
        console.error('Error:', error);
        mostrarEstado('Error al registrar: ' + error.message, 'error');
    }
}

// Función para cargar materiales desde Firebase
async function cargarMateriales() {
    const selectMaterial = document.getElementById('objeto');
    selectMaterial.innerHTML = '<option value="">Selecciona un material</option>';

    try {
        const materialesRef = firebase.database().ref('materiales');
        const snapshot = await materialesRef.once('value');
        const materiales = snapshot.val();

        if (materiales) {
            Object.entries(materiales).forEach(([id, material]) => {
                if (material.cantidad > 0) { // Solo mostrar materiales disponibles
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = material.nombre;
                    selectMaterial.appendChild(option);
                }
            });
        } else {
            console.log('No hay materiales disponibles');
            selectMaterial.innerHTML += '<option disabled>No hay materiales disponibles</option>';
        }
    } catch (error) {
        console.error('Error al cargar materiales:', error);
        selectMaterial.innerHTML += '<option disabled>Error al cargar materiales</option>';
    }
}

// Función para solicitar préstamo
async function solicitarPrestamo() {
    if (!currentUser) {
        alert('Por favor inicia sesión primero');
        return;
    }

    const id_material = document.getElementById('objeto').value;
    const materia = document.getElementById('materia').value;
    const fecha_limite = document.getElementById('fecha_limite').value;

    if (!id_material || !materia || !fecha_limite) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        // Obtener datos del alumno
        const alumnoSnapshot = await firebase.database()
            .ref('alumno')
            .orderByChild('correo')
            .equalTo(currentUser.email)
            .once('value');

        const alumnoData = alumnoSnapshot.val();
        if (!alumnoData) {
            alert('No se encontró registro de estudiante con este correo');
            return;
        }

        const alumno = Object.values(alumnoData)[0];

        // Verificar disponibilidad del material
        const materialRef = firebase.database().ref(`materiales/${id_material}`);
        const materialSnapshot = await materialRef.once('value');
        const material = materialSnapshot.val();

        if (!material || material.cantidad <= 0) {
            alert('Este material no está disponible actualmente');
            return;
        }

        // Crear préstamo
        const prestamosRef = firebase.database().ref('prestamos');
        const nuevoPrestamo = prestamosRef.push();
        
        const prestamoData = {
            id_prestamo: nuevoPrestamo.key,
            matricula_alumno: alumno.matricula,
            nombre_alumno: `${alumno.nombre} ${alumno.apellido_p} ${alumno.apellido_m}`,
            id_material: id_material,
            nombre_material: material.nombre,
            materia: materia,
            fecha_prestamo: new Date().toISOString().split('T')[0],
            fecha_limite: fecha_limite,
            estado: 'activo'
        };

        // Actualizar cantidad de material
        await materialRef.update({
            cantidad: material.cantidad - 1
        });

        // Guardar préstamo
        await nuevoPrestamo.set(prestamoData);        // Mostrar código QR con solo la información esencial
        const qrData = {
            id: prestamoData.id_prestamo,
            mat: prestamoData.matricula_alumno,
            mat_id: prestamoData.id_material,
            fecha: prestamoData.fecha_limite
        };
        
        document.getElementById('qrContainer').style.display = 'block';
        document.getElementById('codigo-qr').innerHTML = '';
        new QRCode(document.getElementById('codigo-qr'), {
            text: JSON.stringify(qrData),
            width: 128,
            height: 128,
            correctLevel: QRCode.CorrectLevel.L
        });

        document.getElementById('mensajeQR').textContent = 
            `Préstamo registrado exitosamente. ID: ${prestamoData.id_prestamo}`;

        // Limpiar formulario
        document.getElementById('formPrestamo').reset();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar el préstamo: ' + error.message);
    }
}

// Cerrar sesión
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'sistema-prestamos.html';
    }).catch((error) => {
        console.error('Error al cerrar sesión:', error);
    });
}
