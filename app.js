const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Ruta de la API GET con una ruta más corta
app.get('/api/nsfw-gen', async (req, res) => {
    const { prompt } = req.query;
    const apiKey = req.headers['x-api-key'] || 'tu-clave-api-aqui'; // Reemplace 'tu-clave-api-aqui' con una clave válida si aplica.

    if (!prompt) {
        return res.status(400).json({
            status: 400,
            content: "Bad Request",
            error: "Invalid Request",
            details: "El parámetro 'prompt' es obligatorio para generar una imagen.",
        });
    }

    try {
        // Paso 1: Obtener la imagen de la API NSFW
        const nsfwResponse = await axios.get('https://fastrestapis.fasturl.cloud/aiimage/nsfw', {
            params: { prompt },
            headers: {
                accept: 'image/png',
                'x-api-key': apiKey,
            },
            responseType: 'arraybuffer', // Importante para manejar imágenes binarias
        });

        // Guardar la imagen temporalmente en el sistema de archivos
        const tempFilePath = path.join(__dirname, 'temp_image.png');
        fs.writeFileSync(tempFilePath, nsfwResponse.data);

        // Paso 2: Subir la imagen a la API de tmpfiles.org
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));

        const uploadResponse = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Eliminar la imagen temporal del sistema de archivos
        fs.unlinkSync(tempFilePath);

        // Paso 3: Devolver el enlace de la imagen subida junto con el creador
        const { data } = uploadResponse;
        if (data && data.data && data.data.url) {
            return res.json({
                status: 'success',
                img: data.data.url, // Cambiado de image_url a img
                creador: 'kenn',
            });
        } else {
            return res.status(500).json({
                status: 'error',
                message: 'Error al subir la imagen a tmpfiles.org',
                creador: 'kenn',
            });
        }
    } catch (error) {
        console.error(error);

        // Manejo de errores específicos
        if (error.response) {
            const { status, data } = error.response;

            // Responder con el error de la API remota
            return res.status(status).json({
                ...data,
                creador: 'kenn',
            });
        }

        // Manejo de otros errores no relacionados con la API remota
        res.status(500).json({
            status: 500,
            content: "Internal Server Error",
            error: "Ocurrió un error inesperado.",
            creador: 'kenn',
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
