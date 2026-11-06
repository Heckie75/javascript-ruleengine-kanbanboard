<script setup>
import tickets from '../data/tickets.json';
import KanbanBoard from './components/KanbanBoard.vue';
import { board } from './board.js';
import { rules } from './rules.js';
</script>

<template>
  <main class="app-shell">
    <header class="page-header">
      <p class="eyebrow">KANBAN / EXAMPLE 01</p>
      <h1>Work, in motion</h1>
      <p class="page-summary">A small board for service class and delivery state.</p>
    </header>
    <KanbanBoard :board="board" :rules="rules" :tickets="tickets" />
  </main>
</template>