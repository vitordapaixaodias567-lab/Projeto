
(function (root) {
  var ID_RE = /^(?:BO-\d{5}|FR-\d{5}|(?!BO-|FR-)[A-Z0-9._-]{3,40})$/;
  var ETAPAS = [
    { status: 'AGENDADA', nome: 'Coleta agendada', rotulo: 'COLETA AGENDADA' },
    { status: 'ENTREGUE', nome: 'Frasco entregue', rotulo: 'FRASCO ENTREGUE' },
    { status: 'EM_ROTA', nome: 'Equipe a caminho', rotulo: 'EQUIPE A CAMINHO' },
    { status: 'COLETADO', nome: 'Frasco coletado', rotulo: 'COLETADO' }
  ];

  function normalizarId(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function validarId(v) { return ID_RE.test(normalizarId(v)); }

  function extrairId(texto) {
    var t = String(texto == null ? '' : texto).trim();
    try { return normalizarId(new URL(t).searchParams.get('id')); }
    catch (e) { return normalizarId(t); }
  }

  function ordenar(movs) {
    return (movs || []).slice().sort(function (a, b) { return new Date(a.dataHora) - new Date(b.dataHora); });
  }

  function statusAtual(movs) {
    var o = ordenar(movs);
    return o.length ? o[o.length - 1].status : null;
  }

  function rotuloStatus(status) {
    var e = ETAPAS.filter(function (x) { return x.status === status; })[0];
    if (status === 'CANCELADA') return 'COLETA CANCELADA';
    return e ? e.rotulo : 'SEM REGISTROS';
  }

  function montarLinhaDoTempo(movs) {
    var o = ordenar(movs);
    var ultimo = o.length ? o[o.length - 1].status : null;
    var itens = ETAPAS.map(function (et, i) {
      var mov = o.filter(function (m) { return m.status === et.status; })[0] || null;
      var estado = 'futura';
      if (mov) estado = (et.status === ultimo && i < ETAPAS.length - 1) ? 'atual' : 'concluida';
      return { status: et.status, nome: et.nome, estado: estado, mov: mov };
    });
    var ult = -1;
    itens.forEach(function (x, i) { if (x.mov) ult = i; });
    itens = itens.filter(function (x, i) { return x.mov || i > ult; });
    var canc = o.filter(function (m) { return m.status === 'CANCELADA'; })[0];
    if (canc) {
      itens = itens.filter(function (x) { return x.mov; });
      itens.forEach(function (x) { x.estado = 'concluida'; });
      itens.push({ status: 'CANCELADA', nome: 'Coleta cancelada', estado: 'cancelada', mov: canc });
    }
    return itens;
  }

  function coordsValidas(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
      isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  function estadoLocalizacao(loc, agora, limiteHoras) {
    if (!loc || !coordsValidas(loc.lat, loc.lng)) return 'indisponivel';
    var min = ((agora || Date.now()) - new Date(loc.dataHora).getTime()) / 6e4;
    if (isNaN(min)) return 'desatualizada';
    if (min <= 3) return 'aovivo';
    return min / 60 > (limiteHoras || 24) ? 'desatualizada' : 'disponivel';
  }

  function decodificarPolyline(str) {
    var i = 0, lat = 0, lng = 0, pts = [], b, sh, r;
    str = String(str || '');
    while (i < str.length) {
      sh = 0; r = 0;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32 && i < str.length);
      lat += (r & 1) ? ~(r >> 1) : (r >> 1);
      sh = 0; r = 0;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32 && i < str.length);
      lng += (r & 1) ? ~(r >> 1) : (r >> 1);
      pts.push([lat / 1e5, lng / 1e5]);
    }
    return pts;
  }

  function diferencaLitros(previsto, coletado) {
    if (coletado == null) return null;
    return Math.round((coletado - previsto) * 100) / 100;
  }

  var api = { ETAPAS: ETAPAS, normalizarId: normalizarId, validarId: validarId, extrairId: extrairId,
    statusAtual: statusAtual, rotuloStatus: rotuloStatus, montarLinhaDoTempo: montarLinhaDoTempo,
    coordsValidas: coordsValidas, decodificarPolyline: decodificarPolyline, estadoLocalizacao: estadoLocalizacao, diferencaLitros: diferencaLitros };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RastreioRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
