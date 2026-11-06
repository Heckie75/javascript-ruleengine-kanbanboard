export const board = {
  title: 'Delivery workflow',
  rows: [
    { id: 'blocker', label: 'Blocker', rules: ['blocker'] },
    { id: 'standard', label: 'Minor changes', rules: [] }
  ],
  columns: [
    { id: 'backlog', label: 'Backlog', rules: ['!todo', '!wip', '!done'], template: 'wide' },
    { id: 'todo', label: 'Todo', rules: ['todo'], template: 'wide' },
    { id: 'work', label: 'In progress', rules: ['wip'], template: 'wide' },
    { id: 'done', label: 'Done', rules: ['done'], template: 'small' }
  ]
};