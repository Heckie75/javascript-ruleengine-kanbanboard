export const rules = {
  todo: {
    match: (ticket) => ticket.status === 'todo'
  },
  wip: {
    match: (ticket) => ticket.status === 'wip'
  },
  done: {
    match: (ticket) => ticket.status === 'done'
  },
  blocker: {
    match: (ticket) => ticket.priority === 'blocker',
    className: 'ticket--blocker'
  }
};