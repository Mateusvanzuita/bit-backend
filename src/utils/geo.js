// src/utils/geo.js
// Helpers geográficos usados pelo módulo de adoção.
// (Mesma fórmula de distância e mesma caixa de busca do módulo do Club.)

function calcDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Caixa (bounding box) em volta de um ponto. 1° de longitude encolhe com cos(lat).
function caixaGeografica(latitude, longitude, raioKm) {
  const raioGrausLat = raioKm / 111;
  const kmPorGrauLon = 111 * Math.cos((latitude * Math.PI) / 180);
  const raioGrausLon = raioKm / Math.max(kmPorGrauLon, 1);
  return {
    latMin: latitude - raioGrausLat,
    latMax: latitude + raioGrausLat,
    lonMin: longitude - raioGrausLon,
    lonMax: longitude + raioGrausLon,
  };
}

function normalizarTexto(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

module.exports = { calcDistanciaKm, caixaGeografica, normalizarTexto };