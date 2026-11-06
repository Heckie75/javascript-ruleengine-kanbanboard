<script setup>
import { computed } from 'vue';
import {
  getFixedDateLabel,
  getPriorityColor,
  getRequestSolutionLabel,
  getTicketAgeDays,
  getTicketAnimation,
  getTicketOriginator,
  getTicketTitle,
  isBlocked,
  isTwikitInProgress,
  shouldShowOriginator,
  ticketTemplates
} from '../../kanban/templates.js';

const props = defineProps({
  ticket: { type: Object, required: true },
  templateName: { type: String, default: 'default' },
  ruleStyles: { type: Array, default: () => [] }
});

const template = computed(() => ticketTemplates[props.templateName] ?? ticketTemplates.default);
const ticketClass = computed(() => [
  template.value.variant === 'small' ? 'ticket-small' : 'ticket-full',
  getTicketAnimation(props.ticket),
  isBlocked(props.ticket) ? 'ticket--blocked' : '',
  template.value.alert ? `ticket--${template.value.alert}` : ''
]);
const ticketStyle = computed(() => `${props.ruleStyles.join(' ')} background-color: ${getPriorityColor(props.ticket.priority_value)};`);
const title = computed(() => getTicketTitle(props.ticket));
const ageDays = computed(() => getTicketAgeDays(props.ticket));
const fixedDateLabel = computed(() => getFixedDateLabel(props.ticket));
const originator = computed(() => shouldShowOriginator() ? getTicketOriginator(props.ticket) : props.ticket.owner);
</script>

<template>
  <article
    class="ticket-card"
    :class="ticketClass"
    :style="ticketStyle"
    :data-kb-ticket-id="ticket.id"
    :data-progress="ticket.progress"
    :data-template-name="templateName"
    :title="title"
  >
    <template v-if="template.variant === 'small'">
      <a :href="`/tracker/projects/client/ticket/${ticket.id}`" target="_blank" rel="noreferrer" draggable="false">#{{ ticket.id }}</a>
      <span v-if="isBlocked(ticket)" class="ticket-badge ticket-badge--blocked">B</span>
      <span v-else-if="isTwikitInProgress(ticket)" class="ticket-badge ticket-badge--active">IP</span>
      <span v-if="fixedDateLabel" class="ticket-badge ticket-badge--date">{{ fixedDateLabel }}</span>
    </template>
    <template v-else>
      <header class="ticket-heading">
        <a :href="`/tracker/projects/client/ticket/${ticket.id}`" target="_blank" rel="noreferrer" draggable="false">#{{ ticket.id }}</a>
        <span v-if="isBlocked(ticket)" class="ticket-badge ticket-badge--blocked">Blocked</span>
        <span v-else-if="isTwikitInProgress(ticket)" class="ticket-badge ticket-badge--active">In progress</span>
      </header>
      <p class="ticket-summary">{{ ticket.summary.slice(0, 24) }}{{ ticket.summary.length > 24 ? '...' : '' }}</p>
      <p class="ticket-request">{{ getRequestSolutionLabel(ticket) }}</p>
      <p v-if="fixedDateLabel" class="ticket-fixed-date">{{ ticket.fixed_date }}</p>
      <footer class="ticket-footer">
        <span>{{ originator }}</span>
        <span>{{ ageDays }}d</span>
      </footer>
    </template>
  </article>
</template>
