<script setup>
import { createVNode, Fragment, onBeforeUnmount, onMounted, reactive, ref, render } from 'vue';
import boardMarkup from '../kanban/board.html?raw';
import fixtureTickets from '../data/tickets.json';
import { Kanban } from '../../js/kanban.js';
import { rules } from '../kanban/rules.js';
import TicketCard from './components/TicketCard.vue';

const boardHost = ref(null);
const unassignedCount = ref(0);
const tickets = reactive(fixtureTickets.map((ticket) => ({ ...ticket })));
const cellRoots = [];
let kanban;
let toggleHandler;

function applyTransitions(ticket, transitions) {
  for (const transition of transitions) {
    for (const [field, value] of Object.entries(transition)) {
      switch (field) {
        case 'field-qa': ticket.progress = value ?? ''; break;
        case 'field-priority': ticket.priority = value ?? ''; break;
        case 'field-type': ticket.type = value ?? ''; break;
        case 'field-milestone': ticket.milestone = value ?? ''; break;
        case 'field-fixed_date': ticket.fixed_date = value ?? ''; break;
        case 'field-approval': ticket.go_live = value === '1' || value === 1 ? '1' : '0'; break;
        case 'field-mandant_created': ticket.client = value ?? ''; break;
        case 'field-mandant_solution_at': ticket.at = value ?? '0'; break;
        case 'field-mandant_solution_nl': ticket.nl = value ?? '0'; break;
        case 'field-mandant_solution_ru': ticket.ru = value ?? '0'; break;
        case 'field-mandant_solution_aw': ticket.aw = value ?? '0'; break;
        case 'action_reassign_reassign_owner': ticket.owner = value ?? ''; break;
        case 'action_resolve_resolve_resolution': ticket.resolution = value ?? ''; break;
        case 'action_resolve': ticket.status = 'closed'; break;
        case 'action_reopen': ticket.status = 'reopened'; break;
        case 'twikit-field-step': ticket._twikit_state = value ? `[${value}]` : ''; break;
        default: break;
      }
    }
  }
  return true;
}

function mountTicketComponents() {
  boardHost.value.querySelectorAll('td[data-kb-col]').forEach((cell) => {
    const row = Number(cell.getAttribute('data-kb-row'));
    const col = Number(cell.getAttribute('data-kb-col'));
    const cellTickets = kanban.getTicketsFromCell(row, col);
    const templateName = kanban.getTemplateFromCell(row, col) || 'default';
    const ruleStyles = kanban.getStylesFromCell(row, col);
    const cards = cellTickets.map((ticket) => createVNode(TicketCard, {
      key: String(ticket.id),
      ticket,
      templateName,
      ruleStyles
    }));

    render(createVNode(Fragment, null, cards), cell);
    cellRoots.push(cell);
  });
}

function unmountTicketComponents() {
  while (cellRoots.length) {
    render(null, cellRoots.pop());
  }
}

function refreshAfterDrop() {
  unmountTicketComponents();
  unassignedCount.value = kanban.populate(tickets, true).length;
  mountTicketComponents();
  kanban.enablePointerDragAndDrop();
}

onMounted(() => {
  kanban = new Kanban();
  kanban.setDefaultTemplate('default');
  kanban.setTicketSelector((ticketId, ticket) => String(ticket.id) === String(ticketId));
  kanban.setDropAction(applyTransitions);
  kanban.setDropObserver(refreshAfterDrop);
  kanban.init(boardMarkup, rules);
  unassignedCount.value = kanban.populate(tickets, true).length;
  boardHost.value.replaceChildren(kanban.getBoardElement());
  mountTicketComponents();
  kanban.enablePointerDragAndDrop();

  toggleHandler = (event) => {
    const toggle = event.target.closest('[data-toggle-view]');
    if (!toggle) return;

    const view = toggle.getAttribute('data-toggle-view');
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    boardHost.value.querySelectorAll('tr[view]').forEach((row) => {
      if (row.getAttribute('view') === view) row.hidden = expanded;
    });
    toggle.setAttribute('aria-expanded', String(!expanded));
  };
  boardHost.value.addEventListener('click', toggleHandler);
});

onBeforeUnmount(() => {
  unmountTicketComponents();
  if (boardHost.value && toggleHandler) {
    boardHost.value.removeEventListener('click', toggleHandler);
  }
});
</script>

<template>
  <main class="example-shell">
    <header class="example-header">
      <p class="eyebrow">KANBAN / EXAMPLE 02</p>
      <h1>Agile board</h1>
      <p class="subtitle">Tenant C delivery flow</p>
    </header>
    <p v-if="unassignedCount" class="unassigned-count">
      {{ unassignedCount }} tickets not assigned to a board cell
    </p>
    <div ref="boardHost" class="board-viewport" aria-label="Agile board"></div>
  </main>
</template>