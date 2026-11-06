# Modular Vue Kanban Board

This project uses Vue 3 and ES modules. The board layout, matching rules, ticket
data, and ticket presentation are separate modules. The table-based engine in
`js/kanban.js` uses browser DOM APIs.

## Run an Example

Open the repository in its Dev Container, then run an example:

```sh
npm run dev:example01
npm run dev:example02
npm run dev:example03
```

Vite prints the URL. Production builds are `npm run build:example01` and
`npm run build:example02` and `npm run build:example03`.

## Create a Board

Use this layout for a new example:

```text
example_03/
  index.html
  data/tickets.json
  kanban/board.html
  kanban/rules.js
  kanban/templates.js
  src/main.js
  src/App.vue
  src/components/TicketCard.vue
```

The HTML table defines workflow columns and service-class rows. Put
`data-kb-rules` and optional `data-kb-template` on header cells; the engine
combines rules inherited from the row and column. Rule names are comma
separated, and `!` negates a name.

```html
<table class="kanban-table">
  <thead>
    <tr>
      <th>Service class</th>
      <th data-kb-rules="!todo,!done" data-kb-template="full">Backlog</th>
      <th data-kb-rules="todo" data-kb-template="compact">Todo</th>
      <th data-kb-rules="done" data-kb-template="compact">Done</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th data-kb-rules="blocker">Blocker</th>
      <td></td><td></td><td></td>
    </tr>
    <tr>
      <th>Standard</th>
      <td></td><td></td><td></td>
    </tr>
  </tbody>
</table>
```

Save this as `kanban/board.html`. `rowspan` and `colspan` are supported. The
engine assigns zero-based `data-kb-row` and `data-kb-col` coordinates during
initialization; do not author those coordinates yourself.

### Board Attributes

| Attribute | Applies to | Meaning |
| --- | --- | --- |
| `data-kb-rules` | `<th>`, `<td>` | Comma-separated rule names. Prefix a name with `!` to negate it. Matching row and column rules are combined. |
| `data-kb-template` | `<th>`, `<td>` | Template name resolved by the Vue presentation layer. A cell template overrides the inherited template. |
| `data-kb-limit` | `<th>` | WIP maximum (`4`), range (`2,5`), open range (`2,`), or `-` for an unbounded displayed counter. An empty value disables the counter. |
| `data-kb-limit-area` | `<th>` | Optional inclusive WIP area: `fromRow,fromCol,toRow,toCol`. Coordinates are zero-based; empty coordinates use the header coordinate, and `+N`/`-N` are relative offsets. Omitted areas are inferred from the table. |
| `data-kb-callbacks` | `<th>` | Comma-separated names in the callback registry passed to `init` or `load`. |
| `data-kb-callbacks-area` | `<th>` | Optional inclusive callback area, using the same coordinate syntax as `data-kb-limit-area`. |
| `data-kb-ticket-id` | Ticket component root | Ticket identifier used to resolve drag/drop to its data record. Bind it from `ticket.id` in Vue. |
| `data-toggle-view` | Example 2 toggle button | App-specific control that hides/shows rows with the matching `view` value. It is handled by Example 2's Vue app, not by the core engine. |

The engine creates `data-kb-row` and `data-kb-col` on table cells during
initialization. Pointer dragging adds `data-kb-draggable` to ticket roots.
`debug(true)` adds `data-kb-debug-rule` to cells. An accepted native HTML drop
adds the `data-kb-dragged` CSS class to the moved root. These are runtime
markers; do not put them in the source table.

### Rules

Export a rules object from `kanban/rules.js`. A `match(ticket)` function is
required; optional properties control transitions, sorting, inheritance, and
cell styling.

```js
const priorityRank = { blocker: 0, critical: 1, normal: 2, minor: 3 };

export const rules = {
  todo: {
    match: (ticket) => ticket.status === 'todo',
    transition: (ticket, transitions, negated) => {
      if (!negated) transitions.push({ status: 'todo' });
      return true;
    }
  },
  done: { match: (ticket) => ticket.status === 'done' },
  blocker: {
    match: (ticket) => ticket.priority === 'blocker',
    style: 'background-color: #f5d6d1;'
  },
  releaseReady: {
    match: (ticket) => ticket.status === 'ready',
    last: true
  },
  byPriority: {
    match: () => true,
    sort: (ticketA, ticketB) =>
      (priorityRank[ticketA.priority] ?? 99) - (priorityRank[ticketB.priority] ?? 99)
  }
};
```

Rules on a cell are conjunctive: every positive rule must match and every
negated rule must fail. `last: true` stops collecting inherited rules beyond
that rule. The built-in `LAST` rule does the same in table markup. The
`sort(ticketA, ticketB)` comparator follows the Array sort contract and orders
tickets within a cell. `conserven` carries tickets between cells as an advanced
routing option.

### Multi-tenant Routing with `conserven`

`conserven` names one or more routing pools. When a matching rule declares a
pool, the ticket remains available to later cells whose matching rules declare
the same pool. This lets one ticket appear in multiple tenant lanes when it is
requested by or solved for multiple tenants. The engine passes the same ticket
record through those cells; it does not clone the ticket.

Example 3 uses a shared `req_or_solve` pool for tenants that can receive the
same work and a `sync_tenants_b_d` pool for tickets shared between Tenant D/Tenant B routes:

```js
rule_req_or_solve_tenant_c: {
  match: (ticket) => ticket.client === 'Tenant C' || ticket.ru === '1',
  conserven: ['req_or_solve', 'sync_tenants_b_d']
},
rule_req_or_solve_tenant_b: {
  match: (ticket) => ticket.client === 'Tenant B' || ticket.nl === '1',
  conserven: ['req_or_solve']
},
rule_sync_tenants_b_d: {
  match: (ticket) => ticket.at === '1' && ticket.nl === '1',
  conserven: ['sync_tenants_b_d']
}
```

Pool names are application-defined strings. A producer and the later consumer
rules must use the same name. Cells are traversed in table order, so arrange
tenant sections in the intended routing order. The Example 3 fixture and unit
test demonstrate a multi-solved-for ticket routed into multiple cells.

Built-in rule names are `MATCH_ALWAYS` (always matches), `MATCH_NEVER` (never
matches), and `LAST` (matches and stops collecting inherited rules). The
engine's `EXAMPLE` rule is internal and is not part of the supported board API.
Other rule names in `data-kb-rules` must exist in the supplied rules object;
unknown names cause initialization to fail.

Rule API:

| Property | Signature | Meaning |
| --- | --- | --- |
| `match` | `(ticket) => boolean` | Required predicate used when routing records into cells. |
| `last` | `boolean` | Stops collecting inherited rules after this rule when true. |
| `sort` | `(ticketA, ticketB) => number` | Orders the cell's assigned tickets using the standard comparator convention. |
| `style` | `string` | CSS declarations contributed to the cell's presentation for a positive matching rule. |
| `conserven` | `string \| string[]` | Routing groups used to carry a ticket forward through later cells. |
| `transition` | `(ticket, transitions, negated) => boolean` | Adds proposed changes for a drop into a cell using this rule. |

The engine evaluates target-cell transition functions during a drop, from the
last resolved rule toward the first. Each may append an application-defined
change object to the shared `transitions` array. `negated` tells the function
whether the corresponding rule name was prefixed with `!`. Returning `false`
stops evaluating earlier transition callbacks; it does not itself reject the
drop. The configured drop action makes the accept/reject decision.

Example: a transition proposes a status change, and the drop action applies
the proposals to the in-memory ticket:

```js
todo: {
  match: (ticket) => ticket.status === 'todo',
  transition: (ticket, transitions, negated) => {
    if (!negated) transitions.push({ status: 'todo' });
    return true;
  }
}

kanban.setDropAction((ticket, transitions) => {
  for (const changes of transitions) Object.assign(ticket, changes);
  return true;
});
```

### WIP Limits

Put `data-kb-limit` on a header cell. A number sets a maximum; `2,5` sets a
minimum and maximum. `data-kb-limit-area` optionally defines the inclusive
counting rectangle as `fromRow,fromCol,toRow,toCol`, using zero-based
coordinates. Empty or signed coordinates are relative to the header cell. If
the area is omitted, the engine derives it from the table structure.

Call `populate(tickets, true)` to calculate WIP counts at startup. Example 2
also repopulates with validation after an accepted drop, so both affected
counters update immediately.

Validation adds one status class to the `<th>` and to its generated `.wip`
counter:

| Class | Meaning |
| --- | --- |
| `wip_ok` | The distinct ticket count is within the configured range, including its bounds. |
| `wip_low` | The count is below the configured minimum. |
| `wip_high` | The count is above the configured maximum. |
| `wip_unknown` | The count could not be classified against the range, for example because a bound is not numeric. |

Style the header and/or the counter element in your stylesheet:

```css
th.wip_ok .wip { background: #d7f0df; color: #174b2b; }
th.wip_low .wip { background: #fff0c2; color: #694d00; }
th.wip_high .wip { background: #f7d8d5; color: #76251e; }
th.wip_unknown .wip { background: #e7e9ec; color: #41474d; }
```

`populate(tickets, true)` resets the previous WIP classes and recalculates
counts. Call `validate()` after changing assignments through another path. A
Vue board should reroute its tickets and call `populate(tickets, true)` after an
accepted drop, then render the updated cell components.

## Vue Ticket Templates

`kanban/templates.js` exports template metadata and helpers. The engine tells
the app which template is assigned to each cell; a Vue component renders the
ticket record:

```js
export const ticketTemplates = {
  full: { variant: 'full' },
  compact: { variant: 'compact' }
};
```

```vue
<script setup>
defineProps({ ticket: { type: Object, required: true } });
</script>

<template>
  <article class="ticket-card" :data-kb-ticket-id="ticket.id">
    <strong>#{{ ticket.id }}</strong>
    <p>{{ ticket.summary }}</p>
  </article>
</template>
```

Ticket fields use Vue text bindings. See [Example 2's TicketCard](example_02/src/components/TicketCard.vue)
for full and compact presentations, badges, age, originator, and priority
styling.

### Template API

The engine resolves a template name per cell. `getTemplateFromCell(row, col)`
returns that name; `getStylesFromCell(row, col)` returns styles from matching
rules. The Vue application uses the name to look up metadata and pass both
values to the ticket component:

```js
export const ticketTemplates = {
  small: { variant: 'small', alert: null },
  default: { variant: 'full', alert: null },
  alert_blocker: { variant: 'full', alert: 'blocker' }
};
```

The Example 2 ticket component accepts `ticket`, `templateName`, and
`ruleStyles` props. Each component root binds `data-kb-ticket-id="ticket.id"`
so the engine can identify it during a drop.

## Vue Integration

The page entry point is ordinary HTML with a module script:

```html
<div id="app"></div>
<script type="module" src="./src/main.js"></script>
```

`main.js` mounts the app:

```js
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
```

In `App.vue`, import the table, rules, and JSON data, then initialize the
engine. `?raw` imports the table as a string:

```js
import boardMarkup from '../kanban/board.html?raw';
import tickets from '../data/tickets.json';
import { Kanban } from '../../js/kanban.js';
import { rules } from '../kanban/rules.js';

const kanban = new Kanban();
kanban.setDefaultTemplate('full');
kanban.init(boardMarkup, rules);
const unassigned = kanban.populate(tickets, true);
const table = kanban.getBoardElement();
```

For each `td[data-kb-col]`, read its zero-based row/column coordinates and use
`getTicketsFromCell(row, col)`, `getTemplateFromCell(row, col)`, and
`getStylesFromCell(row, col)` to create Vue ticket components in that cell.
Example 2's `App.vue` shows the complete setup and cleanup.

## Drag and Drop

Configure the engine with a ticket selector and a drop action. Each ticket
component's root must have `data-kb-ticket-id`.

```js
kanban.setTicketSelector((id, ticket) => String(ticket.id) === String(id));
kanban.setDropAction((ticket, transitions) => {
  for (const changes of transitions) Object.assign(ticket, changes);
  return true;
});
kanban.setDropObserver(() => {
  // In Vue: unmount old cell components, repopulate with validation,
  // then render components with each destination cell's template.
});
kanban.enablePointerDragAndDrop();
```

The engine checks destination rules' `transition(ticket, transitions,
negated)` functions before calling the drop action. Return `false` from the drop
action to reject a move. The observer runs only after an accepted move; use it
to reroute tickets, recalculate WIP counts, and select the destination cell's
template. The transition adapter updates only in-memory ticket data; connect it
to a backend if changes need to persist.

## Core Kanban API

Import the engine as an ES module and initialize it before using board methods:

```js
import { Kanban } from '../../js/kanban.js';

const kanban = new Kanban();
kanban.setDefaultTemplate('default');
kanban.init(boardMarkup, rules, callbacks);
const unassigned = kanban.populate(tickets, true);
```

| Method | Signature | Purpose |
| --- | --- | --- |
| `setDefaultTemplate` | `(name)` | Sets the default presentation name for cells without an inherited template. |
| `init` | `(markup, rules, callbacks?)` | Initializes from a table element or markup containing a table, the rules object, and an optional callback registry. |
| `load` | `async (url, rules, callbacks?)` | Fetches table markup, initializes the board, and resolves to the engine instance. |
| `populate` | `(tickets, validate?)` | Clears prior assignments, routes the supplied records, optionally validates WIP, and returns unmatched records. |
| `validate` | `()` | Recalculates WIP headers from their configured areas. |
| `reset` | `()` | Clears cell assignments and rendered contents, restores WIP labels, and runs callback resets. |
| `getBoardElement` | `()` | Returns the initialized table element for mounting or querying. |
| `getTicketsFromCell` | `(row, col)` | Returns records assigned to zero-based table coordinates. |
| `getTicketsFromArea` | `({ from, to })` | Returns records in an inclusive area with `{ row, col }` endpoints. |
| `getTemplateFromCell` | `(row, col)` | Returns the resolved template name for a cell. |
| `getStylesFromCell` | `(row, col)` | Returns style values contributed by matching rules. |
| `getRuleNamesFromCell` | `(row, col)` | Returns resolved rule names, including `!` prefixes for negated rules. |
| `renderboard` | `(target, presentations)` | Renders assigned tickets into the initialized table and attaches it to a selector or DOM element. Vue apps can instead mount components into `getBoardElement()` cells. |
| `debug` | `(enabled)` | Adds or removes rule/template diagnostics in cell titles. |
| `compile` | `()` | Writes resolved rules, templates, and WIP areas back to table attributes. |
| `triggerCallbacks` | `()` | Runs callback `perform` handlers for their areas. |
| `setTicketSelector` | `(selector)` | Sets `(ticketId, ticket) => boolean` for finding the record represented by a dragged root. |
| `setDropAction` | `(action)` | Sets `(ticket, transitions) => boolean`; a truthy return accepts the move. |
| `setDropObserver` | `(observer)` | Sets `(ticketId, sourceCell, targetCell) => void`, called after an accepted move. |
| `removeDropAction` | `()` | Disables drops by removing the configured drop action. |
| `enableDragAndDrop` | `()` | Enables native HTML drag/drop on ticket roots and cells. |
| `enablePointerDragAndDrop` | `()` | Enables pointer-based dragging for component-rendered ticket roots. |

Callback entries are keyed by the names in `data-kb-callbacks`. Each entry may
provide `perform(tickets, header, board)` and `reset(header, board)` methods.

## Project Examples and Tests

- [Example 1](example_01/src) is a small Vue board with declarative rows and
  columns in `board.js` and a pure routing module.
- [Example 2](example_02/src) uses a complex table, rule-driven
  transitions, WIP limits, Vue ticket components, pointer drag/drop, and a
  demo-only permission adapter.
- [Example 3](example_03/src) extends the complex table across multiple
  tenants and demonstrates shared routing with `conserven`.

Run checks in the Dev Container:

```sh
npm test
npm run test:e2e
```

The unit suite covers routing and rule behavior. Chromium tests cover native
drag/drop, both Vue examples, WIP refresh, and destination template changes.
