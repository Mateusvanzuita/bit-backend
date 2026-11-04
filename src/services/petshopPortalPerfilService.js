// src/services/petshopPortalPerfilService.js
// Perfil público do pet shop (o que o tutor vê no app). `petShopId` vem SEMPRE do token.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { validarUrlImagem } = require('../utils/petshopImagens');

// Só estes campos são editáveis pelo portal. Nome, endereço, localização, ativo, aprovado, planoAtivo,
// pesoDestaque e limiteCuponsAtivos são do Admin (nunca entram aqui).
const CAMPOS = [
  'descricao', 'telefone', 'whatsapp', 'instagram', 'website', 'logoUrl', 'bannerUrl',
  'descontoFavoritoAtivo', 'descontoFavorito',
];

const SELECT = {
  id: true, nome: true, descricao: true, logoUrl: true, bannerUrl: true,
  endereco: true, cidade: true, estado: true,
  telefone: true, whatsapp: true, instagram: true, website: true,
  ativo: true, aprovado: true, planoAtivo: true,
  descontoFavoritoAtivo: true, descontoFavorito: true, limiteCuponsAtivos: true,
};

const serializar = (p) => ({
  id: p.id, nome: p.nome, descricao: p.descricao, logoUrl: p.logoUrl, bannerUrl: p.bannerUrl,
  endereco: p.endereco, cidade: p.cidade, estado: p.estado,
  telefone: p.telefone, whatsapp: p.whatsapp, instagram: p.instagram, website: p.website,
  descontoFavoritoAtivo: p.descontoFavoritoAtivo, descontoFavorito: p.descontoFavorito,
  limiteCuponsAtivos: p.limiteCuponsAtivos,
  situacao: { ativo: p.ativo, aprovado: p.aprovado, planoAtivo: p.planoAtivo },
});

const tem = (b, k) => Object.prototype.hasOwnProperty.call(b, k);

class PetShopPortalPerfilService {
  async obter(petShopId) {
    const p = await prisma.petShop.findUnique({ where: { id: petShopId }, select: SELECT });
    if (!p) throw C.naoEncontrado('Pet shop não encontrado.');
    return serializar(p);
  }

  async atualizar(petShopId, body) {
    C.soCamposPermitidos(body, CAMPOS);
    const atual = await prisma.petShop.findUnique({ where: { id: petShopId }, select: SELECT });
    if (!atual) throw C.naoEncontrado('Pet shop não encontrado.');

    const data = {};
    if (tem(body, 'descricao')) data.descricao = C.texto(body.descricao, 'Descrição', { max: 1000, nulavel: true });
    if (tem(body, 'telefone')) data.telefone = C.texto(body.telefone, 'Telefone', { max: 20, nulavel: true });
    if (tem(body, 'whatsapp')) {
      const bruto = C.texto(body.whatsapp, 'WhatsApp', { max: 25, nulavel: true });
      const digitos = bruto ? bruto.replace(/\D/g, '') : null;
      if (digitos !== null && (digitos.length < 10 || digitos.length > 13)) {
        throw C.invalido('WhatsApp inválido. Informe DDD e número.');
      }
      data.whatsapp = digitos;
    }
    if (tem(body, 'instagram')) {
      const t = C.texto(body.instagram, 'Instagram', { max: 100, nulavel: true });
      data.instagram = t ? t.replace(/^@/, '') : null;
    }
    if (tem(body, 'website')) data.website = C.urlHttp(body.website, 'Site');

    if (tem(body, 'logoUrl')) {
      data.logoUrl = body.logoUrl === null ? null : validarUrlImagem(body.logoUrl, petShopId, 'petshop-logo', 'Logo', atual.logoUrl);
    }
    if (tem(body, 'bannerUrl')) {
      data.bannerUrl = body.bannerUrl === null ? null : validarUrlImagem(body.bannerUrl, petShopId, 'petshop-banner', 'Capa', atual.bannerUrl);
    }

    // Desconto para quem favorita a loja
    const ativoFinal = tem(body, 'descontoFavoritoAtivo') ? C.booleano(body.descontoFavoritoAtivo, 'Desconto ao favoritar') : atual.descontoFavoritoAtivo;
    if (tem(body, 'descontoFavoritoAtivo')) data.descontoFavoritoAtivo = ativoFinal;
    let valorFinal = atual.descontoFavorito;
    if (tem(body, 'descontoFavorito')) {
      valorFinal = C.numero(body.descontoFavorito, 'Desconto para favoritos', { min: 5, max: 100 });
      if (valorFinal === null) throw C.invalido('Informe o desconto para favoritos.');
      data.descontoFavorito = valorFinal;
    }
    if (ativoFinal && (valorFinal < 5 || valorFinal > 100)) {
      throw C.invalido('O desconto para favoritos deve ficar entre 5% e 100%.');
    }

    const mudouDesconto = tem(body, 'descontoFavorito') && valorFinal !== atual.descontoFavorito;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) await tx.petShop.update({ where: { id: petShopId }, data });
      // O cupom FAVORITO é criado uma vez e reaproveitado por clubService.favoritarPetShop: sem isto,
      // mudar o % aqui deixaria o cupom da carteira dos novos favoritos com o valor antigo.
      if (mudouDesconto) {
        await tx.cupom.updateMany({
          where: { petShopId, tipo: 'FAVORITO', ativo: true },
          data: { valorDesconto: valorFinal, titulo: `${valorFinal}% OFF em todas as compras` },
        });
      }
    });

    return this.obter(petShopId);
  }
}

module.exports = new PetShopPortalPerfilService();
