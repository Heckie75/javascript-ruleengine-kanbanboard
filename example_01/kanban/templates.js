var templates = {
  "wide" : function(ticket, styles) {
    
    var s = '';
    s += '<div class="card mb-3">';
    s += '  <div class="card-header">';
    s += '    <div class="my-0 font-weight-bold">${id}</div>';
    s += '  </div>';
    s += '  <div class="card-body ${style}">${summary}</div>';
    s += '  <div class="card-footer">';
    s += '    <div class="row">';
    s += '      <span class="">${assignee}</span>';
    s += '    </div>';
    s += '  </div>';
    s += '</div>';

    s = templates._fill(s, { "style" : styles === undefined || styles == "" ? "mark" : styles});
    return templates._fill(s, ticket);
  },
  "small" : function(ticket, styles) {
    var s = '';
    s += '<div title="' + ticket["summary"] + '" kb-ticket-id=\"#'
        + ticket["id"] + '\" style=\"background-color: #ffaa00; ' + styles
        + '\">';
    s += '<span>#' + ticket["id"] + '</span>';
    s += '</div>';
    return s;
  },
  "_fill" : function(template, ticket) {
    for ( var p in ticket) {
      if (ticket.hasOwnProperty(p)) {
        var reg = new RegExp("\\$\\{" + p + "\\}", "g")
        template = template.replace(reg, ticket[p]);
      }
    }
    return template;
  }
};
