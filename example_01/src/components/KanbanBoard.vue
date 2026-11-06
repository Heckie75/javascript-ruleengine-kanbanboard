<script setup>
import { computed } from 'vue';
import TicketCard from './TicketCard.vue';
import { routeTickets, ticketClasses } from '../routing.js';

const props = defineProps({
  board: { type: Object, required: true },
  rules: { type: Object, required: true },
  tickets: { type: Array, required: true }
});

const routing = computed(() => routeTickets(props.tickets, props.board, props.rules));
</script>

<template>
  <section class="board-section" :aria-label="board.title">
    <div class="board-toolbar">
      <h2>{{ board.title }}</h2>
      <span class="ticket-count">{{ tickets.length }} tickets</span>
    </div>
    <div class="board-scroll">
      <table class="board-table">
        <thead>
          <tr>
            <th class="row-heading" scope="col">Service class</th>
            <th v-for="column in board.columns" :key="column.id" scope="col">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in board.rows" :key="row.id">
            <th class="row-heading" scope="row">{{ row.label }}</th>
            <td v-for="column in board.columns" :key="column.id" :data-row="row.id" :data-column="column.id">
              <TicketCard
                v-for="ticket in routing.cells[row.id][column.id]"
                :key="ticket.id"
                :ticket="ticket"
                :template-name="column.template"
                :classes="ticketClasses(ticket, row, column, rules)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="routing.unassigned.length" class="unassigned-count">
      {{ routing.unassigned.length }} unassigned
    </p>
  </section>
</template>