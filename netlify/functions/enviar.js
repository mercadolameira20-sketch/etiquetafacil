// POST /api/enviar  — o celular manda o formulário e ele fica guardado na fila do servidor.
const { store } = require('./_store');

const json = (status, obj) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj)
});

const txt = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

const fotoOk = (v) => (typeof v === 'string' && v.length <= 300000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(v)) ? v : '';

exports.validar = function validar(b) {
  if (!b || typeof b !== 'object') return null;
  const codigo = txt(b.codigo, 20);
  if (!/^\d{6,20}$/.test(codigo)) return null;
  const usuario = txt(b.usuario, 30);
  if (usuario.length < 2) return null;
  const acao = Number(b.acao);
  if (![1, 2, 3, 4, 5].includes(acao)) return null;
  const id = txt(b.id, 64).replace(/[^\w-]/g, '');
  if (id.length < 8) return null;
  let enviadoEm = new Date(b.enviadoEm);
  if (isNaN(enviadoEm)) enviadoEm = new Date();
  return {
    id,
    enviadoEm: enviadoEm.toISOString(),
    recebidoEm: new Date().toISOString(),
    usuario,
    codigo,
    acao,
    acaoTexto: txt(b.acaoTexto, 60),
    preco: txt(b.preco, 20),
    custo: txt(b.custo, 20),
    obs: txt(b.obs, 500),
    foto: fotoOk(b.foto)
  };
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { erro: 'use POST' });
  if ((event.body || '').length > 400000) return json(413, { erro: 'grande demais' });
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { erro: 'JSON inválido' }); }
  const f = exports.validar(b);
  if (!f) return json(400, { erro: 'formulário inválido' });
  // chave ordenável por data: o receptor lê na ordem em que chegaram
  const chave = `${f.recebidoEm}_${f.id}`;
  await store(event).setJSON(chave, f);
  return json(200, { ok: true, id: f.id });
};
