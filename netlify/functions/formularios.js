// Usado pelo RECEPTOR (programa do Windows):
//   GET  /api/formularios            -> lista os formulários que estão esperando
//   POST /api/formularios {apagar:[chaves]} -> confirma recebimento (remove do servidor)
// Se a variável de ambiente CHAVE_RECEPTOR existir no Netlify, o receptor precisa mandá-la
// no cabeçalho "x-chave".
const { store } = require('./_store');

const json = (status, obj) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj)
});

exports.handler = async (event) => {
  const chaveEsperada = process.env.CHAVE_RECEPTOR;
  if (chaveEsperada && (event.headers['x-chave'] || '') !== chaveEsperada) return json(401, { erro: 'chave inválida' });

  const s = store();
  if (event.httpMethod === 'GET') {
    const { blobs } = await s.list();
    const chaves = blobs.map(b => b.key).sort();
    const itens = [];
    let bytes = 0, usadas = 0;
    // a resposta de uma função do Netlify é limitada (~6 MB): entrega em lotes de até ~3 MB
    for (const k of chaves) {
      const f = await s.get(k, { type: 'json' });
      usadas++;
      if (!f) continue;
      const item = { chave: k, ...f };
      bytes += JSON.stringify(item).length;
      itens.push(item);
      if (bytes > 3000000 || itens.length >= 50) break;
    }
    return json(200, { itens, restantes: Math.max(0, chaves.length - usadas) });
  }
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { erro: 'JSON inválido' }); }
    const lista = Array.isArray(b.apagar) ? b.apagar.slice(0, 200) : [];
    for (const k of lista) if (typeof k === 'string' && k.length < 200) await s.delete(k);
    return json(200, { ok: true, apagados: lista.length });
  }
  return json(405, { erro: 'método não permitido' });
};
