const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const app = express();

// Endpoint para procesar la solicitud con un prompt dinámico
app.get('/api/nsfw-img', async (req, res) => {
  try {
    // Obtener el prompt desde los parámetros de la consulta
    const { prompt } = req.query;

    // Validar que se haya enviado el prompt
    if (!prompt) {
      return res.status(400).json({ error: 'Debes proporcionar un parámetro de consulta llamado "prompt".' });
    }

    // URL de la API que devuelve la imagen, incluyendo el prompt
    const imageApiUrl = `https://fastrestapis.fasturl.cloud/aiimage/nsfw?prompt=${encodeURIComponent(prompt)}`;

    // Descargar la imagen
    const response = await axios({
      url: imageApiUrl,
      method: 'GET',
      responseType: 'stream',
    });

    // Guardar la imagen temporalmente
    const tempFilePath = './temp_image.jpg';
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    // Esperar hasta que se termine de escribir la imagen
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Crear el formulario para subir el archivo
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath));

    // Subir el archivo a tmpfiles.org
    const uploadResponse = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
      headers: formData.getHeaders(),
    });

    // Eliminar el archivo temporal
    fs.unlinkSync(tempFilePath);

    // Extraer el ID y nombre del archivo del enlace devuelto por tmpfiles.org
    const originalUrl = uploadResponse.data.data.url; // Ejemplo: "https://tmpfiles.org/directory/26912606/temp_image.jpg"
    const fileIdMatch = originalUrl.match(/\/(\d+)\/([^/]+)$/);

    // Validar que el formato sea correcto
    if (!fileIdMatch) {
      return res.status(500).json({ error: 'Ocurrió un error al procesar el enlace del archivo.' });
    }

    const [_, fileId, fileName] = fileIdMatch;

    // Construir el enlace en el formato solicitado
    const modifiedUrl = `https://tmpfiles.org/dl/${fileId}/${fileName}`;

    // Devolver el enlace modificado
    res.json({
      img: modifiedUrl,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud.' });
  }
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
