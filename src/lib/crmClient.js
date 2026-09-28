const CRM_BACKEND_URL = process.env.CRM_BACKEND_URL;
const CRM_INTERNAL_API_KEY = process.env.CRM_INTERNAL_API_KEY;

async function notificarVinculoConfirmado({ crmPetId, crmPetshopId }) {
  if (!CRM_BACKEND_URL || !CRM_INTERNAL_API_KEY) {
    console.warn('[CrmClient] Integração não configurada — CRM_BACKEND_URL/CRM_INTERNAL_API_KEY ausentes.');
    return;
  }
  try {
    await fetch(`${CRM_BACKEND_URL}/api/v1/internal/vinculo-clinica/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': CRM_INTERNAL_API_KEY },
      body: JSON.stringify({ crmPetId, crmPetshopId }),
    });
  } catch (error) {
    console.error('[CrmClient] Falha ao notificar CRM sobre vínculo confirmado:', error);
  }
}

async function notificarDesvinculo({ crmPetId, crmPetshopId }) {
  if (!CRM_BACKEND_URL || !CRM_INTERNAL_API_KEY) return;
  try {
    await fetch(`${CRM_BACKEND_URL}/api/v1/internal/vinculo-clinica/desvincular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': CRM_INTERNAL_API_KEY },
      body: JSON.stringify({ crmPetId, crmPetshopId }),
    });
  } catch (error) {
    console.error('[CrmClient] Falha ao notificar CRM sobre desvínculo:', error);
  }
}

module.exports = { notificarVinculoConfirmado, notificarDesvinculo };