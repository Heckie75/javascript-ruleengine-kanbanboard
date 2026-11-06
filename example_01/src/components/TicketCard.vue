<script setup>
import { ticketTemplates } from '../templates.js';

const props = defineProps({
  ticket: { type: Object, required: true },
  templateName: { type: String, default: 'wide' },
  classes: { type: Array, default: () => [] }
});

const template = ticketTemplates[props.templateName] ?? ticketTemplates.wide;
</script>

<template>
  <article
    class="ticket-card"
    :class="[template.className, classes]"
    :data-ticket-id="ticket.id"
    :title="ticket.summary"
  >
    <div class="ticket-heading">
      <strong>{{ ticket.id }}</strong>
      <span v-if="ticket.priority === 'blocker'" class="ticket-flag">Blocker</span>
    </div>
    <p v-if="template.showSummary" class="ticket-summary">{{ ticket.summary }}</p>
    <p v-if="template.showAssignee && ticket.assignee" class="ticket-assignee">
      {{ ticket.assignee }}
    </p>
  </article>
</template>