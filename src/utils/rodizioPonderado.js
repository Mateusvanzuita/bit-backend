/**
 * Seleciona itens aleatoriamente sem repetição, considerando o peso de cada um.
 *
 * Exemplo:
 * pesoDestaque = 1 → chance normal
 * pesoDestaque = 2 → aproximadamente 2x mais chance
 *
 * O peso aumenta a probabilidade de seleção, mas não garante que o item apareça.
 */
function selecionarPonderado(itens, limite, obterPeso = (item) => item.pesoDestaque) {
  if (!Array.isArray(itens) || itens.length === 0 || limite <= 0) {
    return [];
  }

  const candidatos = [...itens];
  const selecionados = [];
  const quantidade = Math.min(limite, candidatos.length);

  while (selecionados.length < quantidade && candidatos.length > 0) {
    const pesos = candidatos.map((item) => {
      const peso = Number(obterPeso(item));
      return Number.isFinite(peso) && peso > 0 ? peso : 1;
    });

    const pesoTotal = pesos.reduce((total, peso) => total + peso, 0);
    let sorteio = Math.random() * pesoTotal;

    let indiceSelecionado = candidatos.length - 1;

    for (let i = 0; i < candidatos.length; i++) {
      sorteio -= pesos[i];

      if (sorteio < 0) {
        indiceSelecionado = i;
        break;
      }
    }

    selecionados.push(candidatos[indiceSelecionado]);
    candidatos.splice(indiceSelecionado, 1);
  }

  return selecionados;
}

module.exports = {
  selecionarPonderado,
};