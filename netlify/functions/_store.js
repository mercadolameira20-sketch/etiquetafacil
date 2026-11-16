// Armazenamento dos formulários: Netlify Blobs (fica guardado mesmo com o receptor fechado).
const { getStore } = require('@netlify/blobs');

function store() {
  return getStore({ name: 'formularios', consistency: 'strong' });
}
module.exports = { store };
