import { treatmentStatusLabel } from '../status-labels.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
}

function dateTime(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
  } catch { return String(value); }
}

function time(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { hour:'2-digit', minute:'2-digit' }).format(new Date(value)); }
  catch { return ''; }
}

function duration(session) {
  const start = new Date(session.startedAt || '').getTime();
  const end = new Date(session.endedAt || Date.now()).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  const mins = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest} min`;
}

function auditDetails(item) {
  if (!item.audit?.length) return '';
  return `
    <details class="v2-history-audit">
      <summary>${item.relatedCount ? `+ ${item.relatedCount} atividade${item.relatedCount === 1 ? '' : 's'} relacionada${item.relatedCount === 1 ? '' : 's'}` : 'Ver detalhe técnico'}</summary>
      <div class="v2-history-audit__list">
        ${item.audit.map((event) => `<div><span>${esc(time(event.occurredAt))}</span><strong>${esc(event.label)}</strong>${event.detail ? `<small>${esc(event.detail)}</small>` : ''}</div>`).join('')}
      </div>
    </details>
  `;
}

function narrative(session) {
  if (!session.narrative?.length) return '<p class="v2-helper">Nenhuma atividade registrada nesta sessão.</p>';
  return `<div class="v2-history-timeline">${session.narrative.map((item) => `
    <article class="v2-history-event">
      <time>${esc(time(item.occurredAt))}</time>
      <div class="v2-history-event__dot" aria-hidden="true"></div>
      <div class="v2-history-event__content">
        <strong>${esc(item.title)}</strong>
        ${item.detail ? `<p>${esc(item.detail)}</p>` : ''}
        ${auditDetails(item)}
      </div>
    </article>
  `).join('')}</div>`;
}

function sessionDetail(session) {
  return `
    <div class="v2-stack">
      <section class="v2-section v2-history-detail-head">
        <button class="v2-link-action" type="button" data-v2-history-back>← Todas as sessões</button>
        <p class="v2-eyebrow">${session.status === 'OPEN' ? 'Sessão em andamento' : 'Sessão encerrada'}</p>
        <h1 class="v2-title">${esc(session.assistedNames?.join(', ') || 'Sessão')}</h1>
        <p class="v2-copy">${esc(dateTime(session.startedAt))}${session.endedAt ? ` · ${esc(duration(session))}` : ''}</p>
      </section>

      <section class="v2-kpis v2-history-kpis" aria-label="Resumo da sessão">
        <div class="v2-kpi"><strong>${session.investigationCompleted}/${session.investigationOpened}</strong><span>investigações concluídas</span></div>
        <div class="v2-kpi"><strong>${session.treatmentsWorked}</strong><span>tratamentos trabalhados</span></div>
        <div class="v2-kpi"><strong>${session.findings + session.notes}</strong><span>achados + notas</span></div>
      </section>

      ${session.longitudinal?.length ? `<section class="v2-card v2-card--soft"><p class="v2-eyebrow">Continuidade</p><strong>Trabalho que segue ativo</strong><div class="v2-history-continuity">${session.longitudinal.map((item) => `<span>${esc(item.title)} · ${esc(treatmentStatusLabel(item.status))}</span>`).join('')}</div></section>` : ''}

      <section class="v2-section">
        <div class="v2-section-head"><div><p class="v2-eyebrow">Histórico narrativo</p><h2>Linha do tempo</h2></div></div>
        ${narrative(session)}
      </section>
    </div>
  `;
}

function sessionCard(session) {
  const title = session.assistedNames?.join(', ') || 'Sessão';
  const eventCount = session.narrative?.length || 0;
  return `
    <article class="v2-history-session-card">
      <div class="v2-history-session-card__head">
        <div><span class="v2-status-pill" data-status="${esc(session.status)}">${session.status === 'OPEN' ? 'Em andamento' : 'Encerrada'}</span><h2>${esc(title)}</h2></div>
        <time>${esc(dateTime(session.startedAt))}</time>
      </div>
      <p class="v2-copy">${session.investigationCompleted} investigação${session.investigationCompleted === 1 ? '' : 'ões'} concluída${session.investigationCompleted === 1 ? '' : 's'} · ${session.treatmentsWorked} tratamento${session.treatmentsWorked === 1 ? '' : 's'} trabalhado${session.treatmentsWorked === 1 ? '' : 's'}${session.endedAt ? ` · ${esc(duration(session))}` : ''}</p>
      <div class="v2-history-session-card__foot"><span>${eventCount} marco${eventCount === 1 ? '' : 's'} narrativo${eventCount === 1 ? '' : 's'}</span><button class="v2-btn v2-btn--ghost" type="button" data-v2-history-session="${esc(session.id)}">Abrir sessão</button></div>
    </article>
  `;
}

export function historyPage(model, ui) {
  const sessions = model.historySessions || [];
  const selected = ui.historySessionId ? sessions.find((item) => item.id === ui.historySessionId) : null;
  if (selected) return sessionDetail(selected);
  return `
    <div class="v2-stack">
      <section class="v2-section">
        <p class="v2-eyebrow">Histórico</p>
        <h1 class="v2-title">Evolução do atendimento</h1>
        <p class="v2-copy">Primeiro a história que faz sentido. O detalhe técnico continua disponível quando você precisa auditar.</p>
      </section>
      ${sessions.length ? `<section class="v2-history-session-list">${sessions.map(sessionCard).join('')}</section>` : `
        <section class="v2-card v2-card--soft v2-empty-state"><strong>Nenhuma sessão registrada</strong><p class="v2-copy">Depois do primeiro atendimento, a evolução aparecerá aqui.</p></section>
      `}
    </div>
  `;
}
