// app.js

// 1. Importar módulos necesarios
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

// 2. Inicializar Express
const app = express();
const port = process.env.PORT || 3000;

// 3. Middlewares
app.use(cors());
app.use(bodyParser.json());

// 4. Variables de Configuración para SQLite Cloud Weblite
const SQLITE_CLOUD_BASE_URL = 'https://cawalewunz.g6.sqlite.cloud:443';
const SQLITE_CLOUD_SQL_ENDPOINT = '/v2/weblite/sql';
const SQLITE_CLOUD_DB_NAME = 'RutaFlores57';

const SQLITE_CLOUD_API_KEY = process.env.SQLITE_CLOUD_API_KEY;

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

    if (!idInspector || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, proporcione ID de Inspector y contraseña.' });
    }

    // *** CAMBIO CLAVE 1: MODIFICAR LA CONSULTA SQL ***
    // Seleccionar idInspector, codInsp y nombre
    const sqlQuery = `SELECT idInspector, codInsp, nombre FROM Inspectores WHERE idInspector = '${idInspector}' AND contraseña = '${password}';`;

    console.log(`Intentando autenticar idInspector: ${idInspector} con SQLite Cloud Weblite.`);
    console.log(`Ejecutando SQL: ${sqlQuery}`); // Para depuración, útil

    try {
        const response = await axios.post(
            `${SQLITE_CLOUD_BASE_URL}${SQLITE_CLOUD_SQL_ENDPOINT}`,
            {
                database: SQLITE_CLOUD_DB_NAME,
                sql: sqlQuery,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${SQLITE_CLOUD_API_KEY}`,
                },
            }
        );

        console.log('Respuesta de SQLite Cloud Status:', response.status);
        console.log('Respuesta de SQLite Cloud Data:', JSON.stringify(response.data, null, 2)); // Usar JSON.stringify para mejor visualización

        // *** CAMBIO CLAVE 2: PROCESAR LA RESPUESTA PARA OBTENER LOS DATOS DEL INSPECTOR ***
        if (response.status === 200 && response.data.data && response.data.data.length > 0) {
            // response.data.data contendrá un array de arrays.
            // Ejemplo: [['cjes06', '06', 'Cristopher Jesus']]
            const inspectorResult = response.data.data[0]; // Obtener la primera (y única) fila de resultados

            // Asumiendo el orden: [idInspector, codInsp, nombre] de tu SELECT
            const inspectorId = inspectorResult[0]; // idInspector
            const inspectorCodInsp = inspectorResult[1]; // codInsp
            const inspectorNombre = inspectorResult[2]; // nombre

            console.log(`Login exitoso para idInspector: ${idInspector}`);

            // *** CAMBIO CLAVE 3: INCLUIR LOS DATOS DEL INSPECTOR EN LA RESPUESTA ***
            res.status(200).json({
                success: true,
                message: 'Login exitoso.',
                inspector: { // Objeto 'inspector' con los datos de inspectores
                    idInspector: inspectorId,
                    codeInsp: inspectorCodInsp,
                    nombre: inspectorNombre
                }
            });
        } else {
            console.log(`Login fallido para idInspector: ${idInspector} - Credenciales incorrectas.`);
            res.status(401).json({ success: false, message: 'ID de Inspector o contraseña incorrectos.' });
        }
    } catch (error) {
        console.error('Error al comunicarse con SQLite Cloud:', error.message);
        if (error.response) {
            console.error('Error de respuesta de SQLite Cloud (status):', error.response.status);
            console.error('Error de respuesta de SQLite Cloud (data):', error.response.data);
            if (error.response.status === 401 || error.response.status === 403) {
                res.status(500).json({ success: false, message: 'Error de autenticación con el servicio de base de datos. (API Key inválida o no permitida)' });
            } else {
                res.status(500).json({ success: false, message: 'Error interno del servidor al verificar credenciales.' });
            }
        } else if (error.request) {
            console.error('No se recibió respuesta de SQLite Cloud:', error.request);
            res.status(500).json({ success: false, message: 'No se pudo conectar con el servicio de base de datos.' });
        } else {
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