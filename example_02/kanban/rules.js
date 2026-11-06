// Version: 2013-05-05
// Regeln f�r Tenant A
// Author: M.Heckenbach
import { getIsoWeek } from './date-utils.js';
import { permission } from './environment.js';

export const rules = {
  _isEmpty : function(s) {
    return typeof s == 'undefined' || s == null || String(s) == 'NaN' || String(s).trim() == '';
  },
  _sort : function(t1, t2) {
    if (String(t1._twikit_state).indexOf(':BLOCKED]') != -1) {
      return 1;
    } else if (String(t2._twikit_state).indexOf(':BLOCKED]') != -1) {
      return -1;
    } else if (t2.priority_value != t1.priority_value) {
      return t1.priority_value - t2.priority_value;
    } else if (rules._isEmpty(t1.progress_time) && !rules._isEmpty(t2.progress_time)) {
      return 1;
    } else if (!rules._isEmpty(t1.progress_time) && rules._isEmpty(t2.progress_time)) {
      return -1;
    } else if (!rules._isEmpty(t1.progress_time) && !rules._isEmpty(t2.progress_time)) {
      return t1.progress_time - t2.progress_time;
    } else {
      return t1.id - t2.id;
    }
  },
  rule_sort_by_ticketid : {
    match : function(ticket) {
      return true;
    },
    sort : function(t1, t2) {
      return t1.id - t2.id;
    }
  },
  // Progress steps (1st Level)
  rule_progress_fastlane : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.priority == 'blocker' && (rules._isEmpty(ticket.progress) || ticket.progress == 'Backlog');
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.priority != 'blocker') {
          transitions.push({
            'field-priority' : 'blocker'
          });
        }
        if (ticket.progress != 'Backlog') {
          transitions.push({
            'field-qa' : 'Backlog'
          });
        }
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    last : true,
    style : 'background-color: #EE9999 !important;'
  },
  rule_progress_backlog : {
    match : function(ticket) {
      return ticket.status != 'closed' && (ticket.progress == 'Backlog' || (rules._isEmpty(ticket.progress) && (ticket.priority == 'critical' || ticket.type == 'Support') && ticket._owner_software_agency == 'True'));
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.milestone !== '') {
          transitions.push({
            'field-milestone' : ''
          });
        }
        if (ticket.progress != 'Backlog') {
          transitions.push({
            'field-keywords' : null
          });
          transitions.push({
            'field-qa' : 'Backlog'
          });
        }
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    }
  },
  rule_progress_autoaccept : {
    match : function(ticket) {
      return ticket.status != 'closed' && (ticket.progress == 'Backlog' || (rules._isEmpty(ticket.progress) && ticket._owner_software_agency == 'True'));
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'Backlog') {
          transitions.push({
            'field-qa' : 'Backlog'
          });
        }
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    },
    last : true
  },
  rule_progress_analysis : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.progress == 'Analysis';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.milestone !== '') {
          transitions.push({
            'field-milestone' : ''
          });
        }
        if (ticket.progress != 'Analysis') {
          transitions.push({
            'field-qa' : 'Analysis'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
        transitions.push({
          'twikit-field-comment' : 'Bitte analysieren'
        });
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    }
  },
  rule_progress_clearing : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.progress == 'Clearing';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.milestone !== '') {
          transitions.push({
            'field-milestone' : ''
          });
        }
        if (ticket.progress != 'Clearing') {
          transitions.push({
            'field-qa' : 'Clearing'
          });
        }
        transitions.push({
          'action_reassign' : '1'
        });
        transitions.push({
          'twikit-field-comment' : null
        });
        transitions.push({
          'twikit-field-step' : null
        });
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    }
  },
  rule_progress_impl : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.progress == 'Implementation';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.milestone !== '') {
          transitions.push({
            'field-milestone' : ''
          });
        }
        if (ticket.progress != 'Implementation') {
          transitions.push({
            'field-qa' : 'Implementation'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
        transitions.push({
          'twikit-field-comment' : 'Bitte umsetzen'
        });
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    }
  },
  rule_progress_qa_ready : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.progress == 'Ready for QA' && ticket.go_live != 1;
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'Ready for QA') {
          transitions.push({
            'field-qa' : 'Ready for QA'
          });
        }
        if (ticket.go_live == 1) {
          transitions.push({
            'field-approval' : '0'
          });
        }
        transitions.push({
          'action_reassign' : '1'
        });
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
        transitions.push({
          'twikit-field-step' : ''
        });		
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_qa_failed : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.progress == 'QA failed' && !ticket.go_live == 1;
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'QA failed') {
          transitions.push({
            'field-qa' : 'QA failed'
          });
        }
        if (ticket.go_live == 1) {
          transitions.push({
            'field-approval' : '0'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_liveqa : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.go_live == '1' && ticket.progress != 'Live-QA failed';
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_liveqa_backlog : {
    match : function(ticket) {
      return ticket.status != 'closed' /*
                                         * && ticket.due <=
                                         * ticket._next_milestone_due
                                         */&& new Date().getTime() < (ticket.due / 1000) && String(ticket.progress).indexOf('QA') != -1;
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'QA passed') {
          transitions.push({
            'field-qa' : 'QA passed'
          });
        }
        if (ticket._next_milestone != ticket.milestone) {
          transitions.push({
            'field-milestone' : ticket._next_milestone
          });
        }
        if (ticket.go_live != 1) {
          transitions.push({
            'field-approval' : '1'
          });
        }
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
        transitions.push({
          'twikit-field-comment' : 'Live-QA KW' + getIsoWeek(new Date(ticket._next_milestone_due / 1000))
        });		
        transitions.push({
          'twikit-field-step' : ''
        });
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_liveqa_ready : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.due <= ticket._next_milestone_due && new Date().getTime() >= (ticket.due / 1000);
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'QA passed') {
          transitions.push({
            'field-qa' : 'QA passed'
          });
        }
        if (ticket.milestone != ticket._prev_milestone) {
          transitions.push({
            'field-milestone' : ticket._prev_milestone
          });
        }
        if (ticket.go_live != 1) {
          transitions.push({
            'field-approval' : '1'
          });
        }
        if (ticket.owner != 'software agency') {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : 'software agency'
          });
        }
        transitions.push({
          'twikit-field-comment' : 'Live-QA KW' + getIsoWeek(new Date(ticket._prev_milestone_due / 1000))
        });
        transitions.push({
          'twikit-field-step' : ''
        });
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_liveqa_failed : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.go_live == 1 && ticket.progress == 'Live-QA failed';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'Live-QA failed') {
          transitions.push({
            'field-qa' : 'Live-QA failed'
          });
        }
        if (ticket.milestone != ticket._prev_milestone) {
          transitions.push({
            'field-milestone' : ticket._prev_milestone
          });
        }
        if (ticket.go_live != 1) {
          transitions.push({
            'field-approval' : '1'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
        transitions.push({
          'twikit-field-comment' : 'Live-QA failed. Bitte pr�fen'
        });
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_liveqa_passed : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.go_live == 1 && ticket.progress == 'Live-QA passed';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'Live-QA passed') {
          transitions.push({
            'field-qa' : 'Live-QA passed'
          });
        }
        if (ticket.milestone != ticket._prev_milestone) {
          transitions.push({
            'field-milestone' : ticket._prev_milestone
          });
        }
        if (ticket.go_live != 1) {
          transitions.push({
            'field-approval' : '1'
          });
        }
        if (ticket.owner != ticket.reporter) {
          transitions.push({
            'action_reassign' : '1'
          });
          transitions.push({
            'action_reassign_reassign_owner' : ticket.reporter
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_closed : {
    match : function(ticket) {
      return ticket.status == 'closed' && ticket.resolution != 'on hold' && !rules._isEmpty(ticket.progress);
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.status != 'closed') {
          transitions.push({
            'action_resolve' : 'resolve'
          });
          transitions.push({
            'action_resolve_resolve_resolution' : 'fixed'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_progress_in_progress : {
    match : function(ticket) {
      return !rules._isEmpty(ticket.progress) && ticket.status != 'closed';
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.status === 'closed') {
          transitions.push({
            'action_reopen' : 'true'
          });
        }
      }
      return true;
    }	
  },
  rule_progress_not_in_progress : {
    match : function(ticket) {
      return rules._isEmpty(ticket.progress) && ticket.status != 'closed';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (!rules._isEmpty(ticket.progress)) {
          transitions.push({
            'field-qa' : ''
          });
        }
      } else {
        transitions.push({
          'field-qa' : null
        });
      }
      return true;
    }
  },
  rule_progress_on_hold : {
    match : function(ticket) {
      return ticket.status == 'closed' && ticket.resolution == 'on hold';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        transitions.push({
          'action_resolve' : 'resolve'
        });
        transitions.push({
          'action_resolve_resolve_resolution' : 'on hold'
        });
      } else {
        transitions.push({
          'action_reopen' : 'true'
        });
	  }
      return true;
    }
  },
  // 2nd Level / Twikit status
  rule_status_accepted : {
    match : function(ticket) {
      return String(ticket.status) == 'accepted';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
      }
      return true;
    }
  },
  rule_twikit_done : {
    match : function(ticket) {
      return String(ticket._twikit_state).indexOf('[Done') != -1;
    },
    transition : function(ticket, transitions, negate) {
      if (negate) {
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
        if (String(ticket._twikit_state).indexOf('[Todo') == -1) {
          transitions.push({
            'twikit-field-step' : 'Todo'
          });
        }
      } else {
        if (String(ticket._twikit_state).indexOf('[Done') == -1) {
          transitions.push({
            'twikit-field-step' : 'Done'
          });
          transitions.push({
            'twikit-field-comment' : null
          });
        }
      }
      transitions.push({
        'twikit-field-team' : permission.getCurrentUsername()
      });
      return true;
    }
  },
  rule_twikit_assigned : {
    match : function(ticket) {
      return !rules._isEmpty(ticket._assignee);
    }
  },
  rule_twikit_empty_state : {
    match : function(ticket) {
      return rules._isEmpty(ticket._twikit_state) || String(ticket._twikit_state).indexOf('[closed') != -1 || String(ticket._twikit_state).indexOf('[new') != -1;
    }
  },
  rule_twikit_sth_todo_state : {
    match : function(ticket) {
      return String(ticket._twikit_state).indexOf('[Todo') != -1 || String(ticket._twikit_state).indexOf('[In progress') != -1 || String(ticket._twikit_state).indexOf('[Done') != -1;
    }
  },
  rule_twikit_todo_or_assigned_or_qa_failed : {
    match : function(ticket) {
      return (!rules._isEmpty(ticket._assignee) && rules.rule_twikit_empty_state.match(ticket)) || rules.rule_twikit_sth_todo_state.match(ticket) || (rules.rule_twikit_empty_state.match(ticket) && String(ticket.progress).indexOf('failed') != -1);
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        transitions.push({
          'twikit-field-comment' : 'QA failed. Bitte pr�fen'
        });
        transitions.push({
          'twikit-field-step' : 'Todo'
        });
      } else {
        transitions.push({
          'twikit-field-comment' : null
        });
        transitions.push({
          'twikit-field-step' : 'Done'
        });
      }
      return true;
    }	
  },
  // 2nd Level
  rule_owner_software_agency : {
    match : function(ticket) {
      return !rules._isEmpty(ticket._owner_software_agency) && (ticket._owner_software_agency == 'True') || ticket.owner == 'frontend agency';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (rules._isEmpty(ticket._owner_software_agency)) {
          transitions.push({
            'action_accept' : '1'
          });
        }
      } else {
        if (!rules._isEmpty(ticket._owner_software_agency)) {
          transitions.push({
            'action_reassign_reassign_owner' : ticket.reporter
          });
          transitions.push({
            'action_reassign' : '1'
          });
        }
      }
      return true;
    }
  },
  rule_owner_frontend_agency : {
    match : function(ticket) {
      return ticket.status != 'closed' && ticket.owner == 'frontend agency';
    },
    transition : function(ticket, transitions, negate) {
      transitions.push({
        'action_reassign' : '1'
      });
      if (!negate) {
        transitions.push({
          'action_reassign_reassign_owner' : 'frontend agency'
        });
      } else {
        transitions.push({
          'action_reassign_reassign_owner' : null
        });
      }
      return true;
    }
  },
  rule_coming_release : {
    match : function(ticket) {
      return ticket.milestone == ticket._next_milestone;
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.milestone != ticket._next_milestone) {
          transitions.push({
            'field-milestone' : ticket._next_milestone
          });
        }
        transitions.push({
      'twikit-field-comment' : '1. QA KW' + getIsoWeek(new Date(ticket._next_milestone_due / 1000))
		});
      } else {
        transitions.push({
          'field-milestone' : null
        });
        transitions.push({
		  'twikit-field-comment' : '1. QA KW'
		});
      }
      return true;
    }
  },
  rule_qa_support : {
    match : function(ticket) {
      return ticket.progress == 'QA failed' || (ticket.progress == 'Ready for QA' && (rules.rule_twikit_sth_todo_state.match(ticket) || !rules._isEmpty(ticket._assignee)));
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'QA failed') {
          transitions.push({
            'field-qa' : 'QA failed'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
      }
      return negate;
    }
  },
  rule_liveqa_support : {
    match : function(ticket) {
      return String(ticket.progress).indexOf('Live-QA failed') != -1 || ((ticket.due / 1000) <= new Date().getTime() && (rules.rule_twikit_sth_todo_state.match(ticket) || !rules._isEmpty(ticket._assignee)));
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.progress != 'Live-QA failed') {
          transitions.push({
            'field-qa' : 'Live-QA failed'
          });
        }
        if (ticket.owner != permission.getCurrentUsername()) {
          transitions.push({
            'action_accept' : '1'
          });
        }
      } else {
        transitions.push({
          'field-qa' : 'QA passed'
        });
      }
      if (ticket.go_live != 1) {
        transitions.push({
          'field-approval' : '1'
        });
      }
      return true;
    }
  },
  // Requested by
  rule_req_tenant_d : {
    match : function(ticket) {
      return ticket.client == 'Tenant D';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant D') {
          transitions.push({
            'field-mandant_created' : 'Tenant D'
          });
        }
        if (ticket.at != 1) {
          transitions.push({
            'field-mandant_solution_at' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_req_tenant_b : {
    match : function(ticket) {
      return ticket.client == 'Tenant B';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant B') {
          transitions.push({
            'field-mandant_created' : 'Tenant B'
          });
        }
        if (ticket.nl != 1) {
          transitions.push({
            'field-mandant_solution_nl' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_req_tenant_c : {
    match : function(ticket) {
      return ticket.client == 'Tenant C';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant C') {
          transitions.push({
            'field-mandant_created' : 'Tenant C'
          });
        }
        if (ticket.ru != 1) {
          transitions.push({
            'field-mandant_solution_ru' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_owner_org', 'sync_tenants_b_d' ]
  },
  rule_req_tenant_a : {
    match : function(ticket) {
      return ticket.client == 'Tenant A';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant A') {
          transitions.push({
            'field-mandant_created' : 'Tenant A'
          });
        }
        if (ticket.aw != 1) {
          transitions.push({
            'field-mandant_solution_aw' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_owner_org', 'sync_tenants_b_d' ]
  },
  // TODO: Hack because of unsolved bug
  rule_req_tenant_c_fix : {
    match : function(ticket) {
      return ticket.client == 'Tenant C';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        transitions.push({
          'field-mandant_created' : 'Tenant C'
        });
        transitions.push({
          'field-mandant_solution_ru' : '1'
        });
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  // TODO: Hack because of unsolved bug
  rule_req_tenant_a_fix : {
    match : function(ticket) {
      return ticket.client == 'Tenant A';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant C') {
          transitions.push({
            'field-mandant_created' : 'Tenant C'
          });
        }
        if (ticket.ru != 1) {
          transitions.push({
            'field-mandant_solution_ru' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    }
  },
  rule_req_software_agency : {
    match : function(ticket) {
      return ticket.client == 'Software agency';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Software agency') {
          transitions.push({
            'field-mandant_created' : 'Software agency'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_owner_org', 'sync_tenants_b_d' ]
  },
  // Requested by or solved for
  rule_req_or_solve_tenant_d : {
    match : function(ticket) {
      return ticket.client == 'Tenant D' || ticket.at == '1';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant D') {
          transitions.push({
            'field-mandant_created' : 'Tenant D'
          });
        }
        if (ticket.at != 1) {
          transitions.push({
            'field-mandant_solution_at' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_solve' ]
  },
  rule_req_or_solve_tenant_b : {
    match : function(ticket) {
      return ticket.client == 'Tenant B' || ticket.nl == '1';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant B') {
          transitions.push({
            'field-mandant_created' : 'Tenant B'
          });
        }
        if (ticket.nl != 1) {
          transitions.push({
            'field-mandant_solution_nl' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_solve' ]
  },
  rule_req_or_solve_tenant_c : {
    match : function(ticket) {
      return ticket.client == 'Tenant C' || ticket.ru == '1';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant C') {
          transitions.push({
            'field-mandant_created' : 'Tenant C'
          });
        }
        if (ticket.ru != 1) {
          transitions.push({
            'field-mandant_solution_ru' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_solve', 'sync_tenants_b_d' ]
  },
  rule_req_or_solve_tenant_a : {
    match : function(ticket) {
      return ticket.client == 'Tenant A' || ticket.aw == '1';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.client != 'Tenant A') {
          transitions.push({
            'field-mandant_created' : 'Tenant A'
          });
        }
        if (ticket.aw != 1) {
          transitions.push({
            'field-mandant_solution_aw' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'req_or_solve', 'sync_tenants_b_d' ]
  },
  // Synergie
  rule_sync_tenants_b_d : {
    match : function(ticket) {
      return ticket.at == '1' && ticket.nl == '1';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.at != 1) {
          transitions.push({
            'field-mandant_solution_at' : '1'
          });
        }
        if (ticket.nl != 1) {
          transitions.push({
            'field-mandant_solution_nl' : '1'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    conserven : [ 'sync_tenants_b_d' ]
  },
  // Service classes
  rule_fastlane : {
    match : function(ticket) {
      return (ticket.priority == 'blocker');
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        transitions.push({
          'field-type' : 'Warranty'
        });
        if (ticket.priority != 'blocker') {
          transitions.push({
            'field-priority' : 'blocker'
          });
        }
      }
      return true;
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    style : 'background-color: #EE9999 !important;'
  },
  rule_class_support : {
    match : function(ticket) {
      return ticket.type == 'Support';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.type != 'Support') {
          transitions.push({
            'field-type' : 'Support'
          });
        }
      }
      return true;
    },
    last : false
  },
  rule_class_accelerated : {
    match : function(ticket) {
      return ticket.priority == 'critical';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.priority != 'critical') {
          transitions.push({
            'field-priority' : 'critical'
          });
        }
      }
      return true;
    },
    last : false,
    style : 'background-color: #EE9999 !important;'
  },
  rule_class_fixed_date : {
    match : function(ticket) {
      return !rules._isEmpty(ticket.fixed_date) && String(ticket.fixed_date).trim() != 'not required' && ticket.type != 'Feature' && ticket.type != 'Project';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (rules._isEmpty(ticket.fixed_date)) {
          transitions.push({
            'field-fixed_date' : (ticket.fixed_date || null)
          });
        }
      }
      return true;
    },
    last : false
  },
  rule_class_feature : {
    match : function(ticket) {
      return ticket.type == 'Feature' || ticket.type == 'Project';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (ticket.type != 'Feature') {
          transitions.push({
            'field-type' : 'Feature'
          });
        }
      }
      return true;
    },
    last : false
  },
  rule_class_trivial : {
    match : function(ticket) {
      return ticket.priority == 'trivial';
    },
    transition : function(ticket, transitions, negate) {
      if (!negate) {
        if (!rules._isEmpty(ticket.fixed_date)) {
          transitions.push({
            'field-fixed_date' : ''
          });
        }
        if (ticket.priority != 'trivial') {
          transitions.push({
            'field-priority' : 'trivial'
          });
        }
      } else {
        if (ticket.priority == 'trivial') {
          transitions.push({
            'field-priority' : 'minor'
          });
        }
      }
      return true;
    },
    last : false,
    style : 'background-color: #CCEEEE !important;'
  },
  rule_alert_critical : {
    match : function(ticket) {
      return ticket.priority == 'critical';
    },
    last : false
  },
  rule_alert_blocker : {
    match : function(ticket) {
      return (ticket.priority == 'blocker');
    },
    sort : function(t1, t2) {
      return rules._sort(t1, t2);
    },
    style : 'background-color: #EE9999 !important;'
  }
};
