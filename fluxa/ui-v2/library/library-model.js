import { PROTOCOL_LIBRARY } from '../../protocol-engine.js';

const TYPE_LABELS = Object.freeze({
  PERSON: 'Pessoa',
  PET: 'PET',
  ENVIRONMENT: 'Ambiente',
  GROUP: 'Grupo',
  SITUATION: 'Situação / Processo',
  OTHER: 'Outro',
});

const TOOL_LABELS = Object.freeze({
  GRAPH: 'Gráfico',
  BIOMETER: 'Biômetro',
  OTHER: 'Outro recurso',
});

const MODALITY_LABELS = Object.freeze({
  REIKI: 'Aplicação de Reiki',
  BACH_FLOWERS: 'Florais de Bach',
  CRYSTALS: 'Cristais',
  RADIONIC_TABLE: 'Mesa radiônica',
});

function therapeuticSettings(state) {
  const raw = state.settings?.therapeuticModalities || {};
  return {
    enabled: Array.isArray(raw.enabled) ? raw.enabled.filter(Boolean) : [],
    custom: Array.isArray(raw.custom) ? raw.custom.map((value) => String(value).trim()).filter(Boolean) : [],
  };
}

function protocols(state) {
  const builtIn = (PROTOCOL_LIBRARY || []).map((item, index) => ({
    id: String(item.id || item.protocolId || item.slug || `protocol-${index}`),
    name: item.name || 'Protocolo',
    category: item.category || 'Fluxa',
    description: item.description || '',
    source: 'Fluxa',
  }));
  const custom = (state.customProtocols || []).filter((item) => !item.archivedAt).map((item, index) => ({
    id: String(item.id || `custom-${index}`),
    name: item.name || item.title || 'Protocolo personalizado',
    category: item.category || 'Personalizado',
    description: item.description || item.notes || '',
    source: 'Personalizado',
  }));
  return [...builtIn, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function therapies(state) {
  const configured = therapeuticSettings(state);
  return [
    { id: 'RADIESTHESIA', label: 'Radiestesia', base: true },
    ...configured.enabled.map((id) => ({ id, label: MODALITY_LABELS[id] || id, base: false })),
    ...configured.custom.map((label, index) => ({ id: `CUSTOM_${index}`, label, base: false })),
  ];
}

export function deriveLibraryModel(state) {
  const assisteds = (state.assistedEntities || [])
    .filter((item) => !item.archivedAt)
    .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'pt-BR'))
    .map((item) => ({
      id: item.id,
      name: item.displayName || 'Assistido',
      type: item.type,
      typeLabel: TYPE_LABELS[item.type] || 'Assistido',
      birthDate: item.birthDate || null,
      details: item.details || '',
    }));

  const resources = (state.tools || [])
    .filter((item) => !item.archivedAt && item.status !== 'ARCHIVED')
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
    .map((item) => ({
      id: item.id,
      name: item.name || 'Recurso',
      type: item.type || 'OTHER',
      typeLabel: TOOL_LABELS[item.type] || 'Recurso',
      purpose: item.purpose || item.notes || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
    }));

  const protocolItems = protocols(state);
  const therapyItems = therapies(state);
  return {
    therapeuticSettings: therapeuticSettings(state),
    library: {
      assisteds,
      resources,
      protocols: protocolItems,
      therapies: therapyItems,
      counts: {
        assisteds: assisteds.length,
        resources: resources.length,
        protocols: protocolItems.length,
        therapies: therapyItems.length,
      },
    },
  };
}
