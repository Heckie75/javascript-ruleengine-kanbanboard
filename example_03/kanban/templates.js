import { permission } from './environment.js';

export const ticketTemplates = {
  alert_blocker: { variant: 'full', alert: 'blocker' },
  alert_accelerated: { variant: 'full', alert: 'accelerated' },
  default: { variant: 'full', alert: null },
  small: { variant: 'small', alert: null }
};

export function isEmpty(value) {
  return value === undefined || value === null || String(value) === 'NaN' || String(value).trim() === '';
}

export function getTicketAgeDays(ticket, now = new Date()) {
  const timestamp = Number(ticket.progress_time) / 1000;
  return Number.isFinite(timestamp) ? Math.max(0, Math.round((now.getTime() - timestamp) / 86400000)) : 0;
}

export function getRequestSolutionLabel(ticket) {
  const tenants = [
    ['Tenant A', ticket.aw],
    ['Tenant B', ticket.nl],
    ['Tenant C', ticket.ru],
    ['Tenant D', ticket.at]
  ].filter(([, enabled]) => enabled === '1').map(([tenant]) => tenant);
  return tenants.length ? tenants.join(', ') : ticket.client || 'No tenant';
}

export function getTicketTitle(ticket, now = new Date()) {
  const estimate = !isEmpty(ticket.estimated) ? ` (${ticket.estimated}h)` : '';
  const fixedDate = !isEmpty(ticket.fixed_date) ? `, ${ticket.fixed_date}` : '';
  return `#${ticket.id}: ${ticket.summary}, ${ticket.priority} ${ticket.type}${estimate}${fixedDate}, ${ticket.reporter}/${getRequestSolutionLabel(ticket)} (${ticket.owner}) (${getTicketAgeDays(ticket, now)})`;
}

export function getTicketOriginator(ticket) {
  if (!isEmpty(ticket._assignee) && ticket._assignee !== ticket._wikiauthor) {
    return `${String(ticket._wikiauthor).slice(0, 2).toUpperCase()} -> ${ticket._assignee.slice(0, 2).toUpperCase()}${ticket._owner_software_agency === 'True' ? '' : ` ~ ${ticket.owner}`}`;
  }
  if (ticket._owner_software_agency === 'True' && ticket._wikiauthor !== ticket.owner && ticket._wikiauthor !== 'software agency') {
    return `${String(ticket._wikiauthor).slice(0, 2).toUpperCase()}${ticket.owner !== 'software agency' ? ` / ${ticket.owner.slice(0, 2).toUpperCase()}` : ''}`;
  }
  if (ticket._owner_software_agency === 'True' && (ticket._wikiauthor === ticket.owner || ticket._wikiauthor === 'software agency')) {
    return String(ticket.owner || '').slice(0, 2).toUpperCase();
  }
  return ticket.owner;
}

export function getPriorityColor(priorityValue) {
  return {
    1: '#ee9999',
    2: '#ee9999',
    3: '#eeeeaa',
    4: '#cef6ce',
    5: '#cceeee'
  }[priorityValue] || '#eeeeaa';
}

export function getTicketAnimation(ticket, now = new Date()) {
  const ticketUpdate = now.getTime() - Number(ticket._ttime) / 1000;
  const agencyUpdate = now.getTime() - Number(ticket._wtime) / 1000;
  if (agencyUpdate < 1200000 && agencyUpdate < ticketUpdate && permission.hasPermission('Software agency (ORG)')) {
    return isEmpty(ticket._assignee) ? `blink delay${ticket.id % 4}` : `shake delay${ticket.id % 4}`;
  }
  if (ticketUpdate < 1200000) {
    return ['new', 'reopened', 'assigned'].includes(ticket.status) ? `shake delay${ticket.id % 4}` : `blink delay${ticket.id % 4}`;
  }
  return '';
}

export function getFixedDateLabel(ticket, now = new Date()) {
  if (isEmpty(ticket.fixed_date)) return '';
  const target = new Date(ticket.fixed_date).getTime();
  if (!Number.isFinite(target)) return '';
  const weeks = Math.round((target - now.getTime()) / 604800000);
  return weeks > 0 ? `${weeks}W` : 'F';
}

export function isBlocked(ticket) {
  return String(ticket._twikit_state).includes(':BLOCKED]');
}

export function isInProgress(ticket) {
  return ticket._twikit_state === '[In progress]';
}

export function shouldShowOriginator() {
  return permission.hasPermission('Software agency (ORG)');
}
