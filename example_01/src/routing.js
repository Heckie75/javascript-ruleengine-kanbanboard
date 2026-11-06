function matchesRules(ticket, ruleNames, rules) {
  return ruleNames.every((ruleName) => {
    const negated = ruleName.startsWith('!');
    const name = negated ? ruleName.slice(1) : ruleName;
    const rule = rules[name];

    if (!rule) {
      throw new Error(`Unknown board rule: ${name}`);
    }

    return negated ? !rule.match(ticket) : rule.match(ticket);
  });
}

export function routeTickets(tickets, board, rules) {
  const cells = Object.fromEntries(
    board.rows.map((row) => [row.id, Object.fromEntries(board.columns.map((column) => [column.id, []]))])
  );
  const unassigned = [];

  for (const ticket of tickets) {
    const row = board.rows.find((candidate) => matchesRules(ticket, candidate.rules, rules));
    const column = board.columns.find((candidate) => matchesRules(ticket, candidate.rules, rules));

    if (!row || !column) {
      unassigned.push(ticket);
      continue;
    }

    cells[row.id][column.id].push(ticket);
  }

  return { cells, unassigned };
}

export function ticketClasses(ticket, row, column, rules) {
  return [...new Set([...row.rules, ...column.rules]
    .filter((name) => !name.startsWith('!'))
    .map((name) => rules[name].className)
    .filter(Boolean))];
}