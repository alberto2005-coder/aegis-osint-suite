const Joi = require('joi');
const axios = require('axios');

const groqSchema = Joi.object({
  image: Joi.string().required()
});

async function handleGroq(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Usa POST para Groq' });
  }

  const { error, value } = groqSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const base64Image = value.image;
  const apiKey = req.headers['x-groq-api-key'] || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: { message: 'Clave API de Groq no configurada' } });
  }

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Eres un experto en geolocalización visual y OSINT (inteligencia de fuentes abiertas). Analiza minuciosamente los detalles de esta foto e intenta identificar monumentos, edificios o accidentes geográficos específicos para precisar la ciudad o punto exacto de la toma. Explica tus deducciones paso a paso de forma clara y estructurada en español y concluye con la localización exacta estimada.' },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      }],
      temperature: 0.2,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return res.json(response.data);
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    return res.status(500).json({ error: { message: msg } });
  }
}

module.exports = {
  handleGroq
};
