var rules = {
  "todo" : {
      "match" : function(ticket) {
          return ticket["status"] === "todo";
      },
      "last" : false,
      "style" : ''
  },
  "wip" : {
      "match" : function(ticket) {
          return ticket["status"] === "wip";
      },
      "last" : false,
      "style" : ''
  },
  "done" : {
      "match" : function(ticket) {
          return ticket["status"] === "done";
      },
      "last" : false,
      "style" : ''
  },
  "blocker" : {
      "match" : function(ticket) {
          return ticket["priority"] === "blocker";
      },
      "last" : false,
      "style" : 'table-danger'
  }
};