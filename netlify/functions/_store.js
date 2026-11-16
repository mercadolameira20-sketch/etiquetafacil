// Armazenamento dos formulários: Netlify Blobs (fica guardado mesmo com o receptor fechado).
const { getStore, connectLambda } = require('@netlify/blobs');

// Funções no formato "handler(event)" precisam chamar connectLambda(event) para o
// Netlify Blobs receber o site e o token automaticamente.
function store(event) {
  if (event && typeof connectLambda === 'function') connectLambda(event);
  return getStore({ name: 'formularios', consistency: 'strong' });
}
module.exports = { store };
