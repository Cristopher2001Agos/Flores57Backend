// app.js

// 1. Importar módulos necesarios
// Importaciones predeterminadas para Express, body-parser, cors, axios
import express from 'express';
import bodyParser from 'body-parser'; 
import cors from 'cors'; 
import axios from 'axios'; 

// Importar y configurar dotenv para cargar variables de entorno
import dotenv from 'dotenv'; 
dotenv.config(); 

// 2. Inicializar Express
const app = express();
const port = process.env.PORT || 3000; 

// 3. Middlewares
// Habilitar CORS para todas las rutas (puedes configurarlo más específicamente si es necesario)
app.use(cors()); 
// Para parsear solicitudes con cuerpo JSON
app.use(bodyParser.json());

// 4. Variables de Configuración para SQLite Cloud Weblite
// Estas variables son constantes de tu aplicación, no necesitan ser variables de entorno si no cambian
const SQLITE_CLOUD_BASE_URL = 'https://cawalewunz.g6.sqlite.cloud:443';
const SQLITE_CLOUD_SQL_ENDPOINT = '/v2/weblite/sql';
const SQLITE_CLOUD_DB_NAME = 'RutaFlores57'; // Nombre de tu base de datos

// Obtener la API Key desde las variables de entorno
// ¡CRUCIAL para la seguridad! Lee del archivo .env que creaste.
const SQLITE_CLOUD_API_KEY = process.env.SQLITE_CLOUD_API_KEY; //

// Verificar que la API Key esté cargada
if (!SQLITE_CLOUD_API_KEY) {
    console.error('ERROR: La variable de entorno SQLITE_CLOUD_API_KEY no está definida.');
    console.error('Por favor, crea un archivo .env en la raíz de tu proyecto backend con SQLITE_CLOUD_API_KEY=TU_API_KEY_AQUI');
    process.exit(1); 
}

// 5. Ruta de prueba (opcional, para verificar que el servidor está corriendo)
app.get('/', (req, res) => {
    res.send('Backend de login funcionando.');
});

// 6. Endpoint de Login
app.post('/login', async (req, res) => {
    const { idInspector, password } = req.body; 

    // Validar que se hayan proporcionado las credenciales
    if (!idInspector || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, proporcione ID de Inspector y contraseña.' });
    }

    // Construir la consulta SQL para SQLite Cloud
    // NOTA DE SEGURIDAD: En producción, usaríamos parámetros para prevenir inyección SQL.
    // Para esta etapa, mantenemos la simplificación.
    const sqlQuery = `SELECT idInspector FROM Inspectores WHERE idInspector = '${idInspector}' AND contraseña = '${password}';`; // Consulta SQL

    console.log(`Intentando autenticar idInspector: ${idInspector} con SQLite Cloud Weblite.`);

    try {
        // Realizar la solicitud POST a la API de SQLite Cloud Weblite
        const response = await axios.post(
            `${SQLITE_CLOUD_BASE_URL}${SQLITE_CLOUD_SQL_ENDPOINT}`, // Endpoint para ejecutar SQL
            {
                database: SQLITE_CLOUD_DB_NAME, 
                sql: sqlQuery,          
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${SQLITE_CLOUD_API_KEY}`, // Aquí se envía la API Key de forma segura con Bearer
                },
            }
        );

        // Debugging de la respuesta de SQLite Cloud
        console.log('Respuesta de SQLite Cloud Status:', response.status);
        console.log('Respuesta de SQLite Cloud Data:', response.data);

        // Procesar la respuesta de SQLite Cloud
        // Si el estado es 200 y hay resultados, el login es exitoso
        if (response.status === 200 && response.data.data && response.data.data.length > 0) { //
            console.log(`Login exitoso para idInspector: ${idInspector}`);
            res.status(200).json({ success: true, message: 'Login exitoso.' });
        } else {
            console.log(`Login fallido para idInspector: ${idInspector} - Credenciales incorrectas.`);
            res.status(401).json({ success: false, message: 'ID de Inspector o contraseña incorrectos.' });
        }
    } catch (error) {
        // Manejo de errores de la solicitud a SQLite Cloud
        console.error('Error al comunicarse con SQLite Cloud:', error.message);
        if (error.response) {
            // El servidor respondió con un estado fuera del rango 2xx
            console.error('Error de respuesta de SQLite Cloud (status):', error.response.status);
            console.error('Error de respuesta de SQLite Cloud (data):', error.response.data);
            if (error.response.status === 401 || error.response.status === 403) {
                res.status(500).json({ success: false, message: 'Error de autenticación con el servicio de base de datos. (API Key inválida o no permitida)' });
            } else {
                res.status(500).json({ success: false, message: 'Error interno del servidor al verificar credenciales.' });
            }
        } else if (error.request) {
            // La solicitud fue hecha pero no se recibió respuesta (ej. problema de red)
            console.error('No se recibió respuesta de SQLite Cloud:', error.request);
            res.status(500).json({ success: false, message: 'No se pudo conectar con el servicio de base de datos.' });
        } else {
            // Algo más causó el error
            console.error('Error al configurar la solicitud a SQLite Cloud:', error.message);
            res.status(500).json({ success: false, message: 'Error inesperado del servidor.' });
        }
    }
});

// 7. Iniciar el servidor Express
app.listen(port, () => {
    console.log(`Backend de login escuchando en http://localhost:${port}`);
    console.log(`¡Ahora puedes configurar tu Flutter app para conectar a http://localhost:${port}/login`);
});