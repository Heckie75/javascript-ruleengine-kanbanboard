/**
 * Rule-based classifier table for agile
 *
 * MIT License
 *
 * Copyright (c) 2018 Martin Heckenbach
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function Kanban() {
  // for internal purposes only
  var DEFAULT_RULES = {
    EXAMPLE : {
      match : function(ticket) {
        return true;
      },
      transition : function(ticket, transitions) {
        return true;
      },
      last : false,
      conserven : [ 'holladiewaldfee', 'rubbeldiekatz' ],
      sort : function(o1, o2) {
        return o1 - o2;
      },
      style : 'background-color: #EE9999;'
    },
    MATCH_ALWAYS : {
      match : function(ticket) {
        return true;
      },
      transition : function(ticket, transitions) {
        return true;
      },
      last : false,
      conserven : null,
    },
    MATCH_NEVER : {
      match : function(ticket) {
        return false;
      },
      transition : function(ticket, transitions) {
        return false;
      },
      last : false,
      conserven : null,
    },
    LAST : {
      match : function(ticket) {
        return true;
      },
      last : true,
      conserven : null,
    }
  };

  var DEFAULT_RENDERER = function(ticket, styles) {
    var s = '<nobr style="' + styles.join(' ') + '">';
    if (typeof ticket == 'object') {
      var i = 0;
      for (p in ticket) {
        if (!ticket.hasOwnProperty(p)) {
          continue;
        }
        if (++i > 2)
          break;
        s += ticket[p] + ' ';
      }
    } else {
      s = ticket;
    }
    s += '</nobr> ';
    return s;
  };

  var ArrayList = function() {
    var array = Array();
    array.indexOf = function(e, matcher) {
      if (!matcher) {
        matcher = function(e1, e2) {
          return e1 === e2;
        };
      }
      for (var i = 0; i < this.length; i++) {
        if (matcher(this[i], e)) {
          return i;
        }
      }
      return -1;
    };
    array.getElement = function(matcher) {
      for (var i = 0; i < this.length; i++) {
        if (matcher(this[i])) {
          return this[i];
        }
      }
      return null;
    };
    array.addAll = function(array) {
      for (var i = 0; i < array.length; i++) {
        this.push(array[i]);
      }
      return this;
    };
    array.distinct = function(matcher) {
      if (!matcher) {
        matcher = function(e1, e2) {
          return e1 === e2;
        };
      }
      var i = 0;
      while (i < this.length) {
        for (var j = this.length - 1; j > i; j--) {
          if (matcher(this[i], this[j])) {
            this.splice(j, 1);
          }
        }
        ++i;
      }
      return this;
    };
    array.pushDistinct = function(e) {
      if (array.indexOf(e) === -1) {
        array.push(e);
        return true;
      }
      return false;
    };
    return array;
  };

  var getArea = function(e) {
    var row = parseInt($(e).attr('data-kb-row'));
    var col = parseInt($(e).attr('data-kb-col'));
    var _rowspan = $(e).attr('rowspan');
    _rowspan = _rowspan ? parseInt(_rowspan) : 1;
    var _colspan = $(e).attr('colspan');
    _colspan = _colspan ? parseInt(_colspan) : 1;
    return {
      row : row,
      col : col,
      rowspan : _rowspan,
      colspan : _colspan
    };
  };

  var parseArea = function(row, col, area) {
    var parse = function(ordinate, value) {
      var result;
      if (!value) {
        result = ordinate;
      } else if (value.startsWith("+") || value.startsWith("-")) {
        result = ordinate + parseInt(value);
      } else {
        result = parseInt(value);
      }
      return result;
    };
    if (area === '') {
      return null;
    }
    var a = area.split(',');
    return [ {
      row : parse(row, a[0]),
      col : parse(col, a[1])
    }, {
      row : parse(row, a[2]),
      col : parse(col, a[3])
    } ];
  };

  var wipRange = function(kb_limit) {
    if (!kb_limit) {
      return null;
    }
    var range = kb_limit.split(',');
    if (range.length === 1) {
      return [ 0, isNaN(parseInt(range[0])) ? Number.MAX_VALUE : parseInt(range[0]) ];
    } else {
      var low = parseInt(range[0]);
      var high = parseInt(range[1]);
      return [ isNaN(low) ? 0 : parseInt(low), isNaN(high) ? Number.MAX_VALUE : high ];
    }
  };

  var wipStatement = function(kb_limit, total) {
    if (!kb_limit && typeof total === 'undefined') {
      return '';
    } else if (!kb_limit && typeof total !== 'undefined') {
      return String(total);
    }

    var range = kb_limit.split(',');
    var s = (typeof total !== 'undefined' ? total + ' / ' : '');
    if (range.length === 1) {
      return s + range[0];
    }

    var low = parseInt(range[0]);
    var high = parseInt(range[1]);
    if (range.length === 2 && isNaN(low) && !isNaN(high)) {
      s += String(high);
    } else if (range.length === 2 && !isNaN(low) && isNaN(high)) {
      s += '[ >' + low + ']';
    } else if (range.length === 2 && !isNaN(low) && !isNaN(high)) {
      s += '[' + low + ' - ' + high + ']';
    } else {
      s += kb_limit;
    }
    return s;
  };

  var _innerState = {
    rules : null,
    kanbanboard : null,
    rulematrix : null,
    defaultTemplate : null,
    tickets : null,
    dropAction : null,
    ticketSelector : null
  };

  // everything that is needed to init the internal rulematrix
  var initRulematrix = function(kanbanboard, rules) {
    var _seeker = {
      CONTINUE : 0,
      LAST : 1,
      LAST_BOTH : 2,
      terminatesLast : function(r) {
        if (r && r.length) {
          return r.length > 0 ? r[r.length - 1].last : false;
        }
        return r && r.last;
      },
      seek : function(kanbanboard, rulematrix, rules, collector, apply, fromTopLeft) {
        fromTopLeft = fromTopLeft ? fromTopLeft : false;
        var that = this;
        $('tr', kanbanboard).children().each(function(i, e) {
          if (!($(e).is('th[data-kb-col]') || $(e).is('td[data-kb-col]'))) {
            return;
          }
          var result = ArrayList();

          // coordinates and area
          _a = getArea(e);

          // seek rows upwards (fromTopLeft =
          // false), downwards
          // (fromTopLeft = true)
          last = that.CONTINUE;
          for (var _r = _a.row; _r >= 0 && _r < rulematrix.length && last === that.CONTINUE; (fromTopLeft ? _r++ : _r--)) {
            last = collector(_r, _a.col, (fromTopLeft ? _r < _a.row + _a.rowspan : _r === _a.row), rulematrix[_r][_a.col], rules, result);
          }
          // seek cols to leftwards
          // (fromTopLeft = false),
          // rightwards (fromTopLeft = true)
          last = that.LAST_BOTH === last ? that.LAST_BOTH : that.CONTINUE;
          for (var _c = _a.col + (fromTopLeft ? 1 : -1); _c >= 0 && _c < rulematrix[0].length && last === that.CONTINUE; (fromTopLeft ? _c++ : _c--)) {
            last = collector(_a.row, _c, (fromTopLeft ? _c < _a.col + _a.colspan : false), rulematrix[_a.row][_c], rules, result);
          }

          apply(rulematrix[_a.row][_a.col], result);
        });
      }
    };

    // basic init
    var init = function(kanbanboard) {
      var rulematrix = ArrayList();
      var total_rows = $('tr', kanbanboard).length;
      var total_cols = 0;
      $('tr', kanbanboard).first().find('th,td').each(function(i, e) {
        var _colspan = $(e).attr('colspan');
        _colspan = _colspan ? parseInt(_colspan) : 1;
        total_cols += _colspan;
      });
      for (var _r = 0; _r < total_rows; _r++) {
        var row = rulematrix[_r] = ArrayList();
        for (var _c = 0; _c < total_cols; _c++) {
          row[_c] = null;
        }
      }
      return rulematrix;
    };

    // copy attribute from html to rulematrix object
    var applyAttributes = function(kanbanboard, rulematrix) {
      var row = -1;
      $('tr', kanbanboard).each(function(ir, er) {
        row++;
        $(er).children().each(function(ic, ec) {
          if (!$(ec).is('th,td')) {
            return;
          }

          var rulematrixCell = {
            matcher : $(ec).attr('data-kb-rules'),
            limit : $(ec).attr('data-kb-limit'),
            limitArea : $(ec).attr('data-kb-limit-area'),
            callbacks : $(ec).attr('data-kb-callbacks'),
            callbacksArea : $(ec).attr('data-kb-callbacks-area'),
            template : $(ec).attr('data-kb-template'),
            isHeader : $(ec).is('th'),
            rules : null,
            styles : null,
            tickets : ArrayList()
          };

          var _rowspan = $(ec).attr('rowspan');
          _rowspan = _rowspan ? parseInt(_rowspan) : 1;

          var _colspan = $(ec).attr('colspan');
          _colspan = _colspan ? parseInt(_colspan) : 1;

          var _i = 0;
          for (var _c = 0; _c < _colspan; _c++) {
            // next free
            // col of
            // current
            // row
            _i = -1;
            var rulematrixRow = rulematrix[row];
            while (rulematrixRow[++_i] !== null)
              ;

            for (var _r = 0; _r < _rowspan; _r++) {
              rulematrix[row + _r][_i] = rulematrixCell;
            }
          }

          // remember
          // coordinates
          $(ec).attr('data-kb-row', String(row));
          $(ec).attr('data-kb-col', String(1 + _i - _colspan));
        });
      });
    };

    var applyRules = function(kanbanboard, rulematrix, rules) {
      var collect = function(row, col, self, rulematrixCell, rules, result) {
        if (!rulematrixCell.matcher) {
          return self && rulematrixCell.isHeader ? _seeker.LAST_BOTH : _seeker.CONTINUE;
        }

        var _rules = ArrayList();
        if (self) {
          var _rulenames = rulematrixCell.matcher.split(',');
          var _rule = null;
          for (var _n = 0; _n < _rulenames.length && !_seeker.terminatesLast(_rule); _n++) {
            var _negate = _rulenames[_n].substring(0, 1) === '!';
            var _name = _negate ? _rulenames[_n].substring(1) : _rulenames[_n];
            _rule = rules[_name];
            if (!_rule) {
              _rule = DEFAULT_RULES[_name];
              if (!_rule) {
                // rule not exist -> ignore
                throw 'rule does not extist <' + _name + '>, see [' + row + '|' + col + ']';
                // continue;
              }
            }

            _rule = {
              name : _name,
              match : _rule.match ? _rule.match : DEFAULT_RULES.MATCH_ALWAYS.match,
              transition : _rule.transition ? _rule.transition : DEFAULT_RULES.MATCH_ALWAYS.transition,
              negate : _negate,
              conserven : !_rule.conserven ? null : ArrayList().addAll(_rule.conserven instanceof Array ? _rule.conserven : _rule.conserven.split(',')),
              tickets : ArrayList(),
              last : _rule.last ? true : false,
              sort : _rule.sort,
              style : _rule.style ? _rule.style : null
            };
            _rules.push(_rule);
          }
          result.addAll(_rules);
          return rulematrixCell.isHeader ? _seeker.LAST_BOTH : _seeker.terminatesLast(_rule) ? (self ? _seeker.LAST_BOTH : _seeker.LAST) : _seeker.CONTINUE;
        } else if (rulematrixCell.isHeader && rulematrixCell.rules !== null) {
          result.addAll(rulematrixCell.rules);
          return _seeker.terminatesLast(result) ? _seeker.LAST : _seeker.CONTINUE;
        } else {
          return _seeker.CONTINUE;
        }
      };

      var apply = function(rulematrixCell, result) {
        rulematrixCell.rules = result.distinct(function(r1, r2) {
          return !DEFAULT_RULES[r1.name] && r1.name === r2.name;
        });

        rulematrixCell.styles = ArrayList();
        for (var i = 0; i < rulematrixCell.rules.length; i++) {
          if (!rulematrixCell.rules[i].negate && rulematrixCell.rules[i].style !== null) {
            rulematrixCell.styles.push(rulematrixCell.rules[i].style);
          }
        }
        rulematrixCell.styles.distinct();
      };
      _seeker.seek(kanbanboard, rulematrix, rules, collect, apply);
    };

    var applyTemplate = function(kanbanboard, rulematrix, rules) {
      var collect = function(row, col, self, rulematrixCell, rules, result) {
        if ((self || rulematrixCell.isHeader) && rulematrixCell.template) {
          result.push(rulematrixCell.template);
          return _seeker.LAST_BOTH;
        } else if (self && rulematrixCell.isHeader) {
          return _seeker.LAST_BOTH;
        } else {
          return _seeker.CONTINUE;
        }
      };

      var apply = function(rulematrixCell, result) {
        if (result.length > 0) {
          rulematrixCell.template = result[result.length - 1];
        } else if (!rulematrixCell.isHeader) {
          rulematrixCell.template = _innerState.defaultTemplate;
        }
      };
      _seeker.seek(kanbanboard, rulematrix, rules, collect, apply);
    };

    var applyLimitOrCallbacks = function(kanbanboard, rulematrix, rules, what) {
      var collect = function(row, col, self, rulematrixCell, rules, result) {
        if (self && rulematrixCell[what + 'Area']) {
          result.addAll(parseArea(row, col, rulematrixCell[what + 'Area']));
          return _seeker.LAST_BOTH;
        }
        if (self && !rulematrixCell[what]) {
          return _seeker.LAST_BOTH;
        } else if (!self && typeof rulematrixCell[what] !== 'undefined') {
          return _seeker.LAST;
        } else if (rulematrixCell.isHeader && (!self || result.length === 0)) {
          return _seeker.CONTINUE;
        }
        if (result.length === 0) {
          result.push({
            row : row,
            col : col
          });
        } else {
          result[1] = {
            row : Math.max(result[result.length - 1].row, row),
            col : Math.max(result[result.length - 1].col, col)
          };
        }
        return _seeker.CONTINUE;
      };

      var apply = function(rulematrixCell, result) {
        if (result.length === 0) {
          return;
        }
        rulematrixCell[what + 'Area'] = {
          from : result[0],
          to : result[result.length - 1]
        };
        if (what === 'limit') {
          rulematrixCell.limit_range = wipRange(rulematrixCell[what]);
        }
      };
      _seeker.seek(kanbanboard, rulematrix, rules, collect, apply, true);
    };

    var rulematrix = init(kanbanboard);
    applyAttributes(kanbanboard, rulematrix);
    applyRules(kanbanboard, rulematrix, rules);
    applyTemplate(kanbanboard, rulematrix, rules);
    applyLimitOrCallbacks(kanbanboard, rulematrix, rules, 'limit');
    if (_innerState.callbacks) {
      applyLimitOrCallbacks(kanbanboard, rulematrix, rules, 'callbacks');
    }
    return rulematrix;
  };

  // execute rules (rule engine): try to match tickets for rules on each cell
  var applyTickets = function(tickets) {
    var getConserve = function(c, label) {
      if (!c[label]) {
        c[label] = ArrayList();
      }
      return c[label];
    };

    var fire = function(rules, ticket, remainingConserven, currentConserve) {

      var matched = true;
      var matchedConserve = false;
      var newConserven = ArrayList();

      for (var _r = 0; _r < rules.length && matched; _r++) {
        var rule = rules[_r];
        try {
          matched &= rule.negate !== rule.match(ticket);
        } catch (exception) {
          throw 'Exception during firing rule <' + _r + '>:' + exception;
        }
        matched = (matched && rule.conserven !== null && rule.tickets.indexOf(ticket) !== -1 ? false : matched);
        if (matched) {
          for (var _c = 0; rule.conserven !== null && _c < rule.conserven.length && !matchedConserve; _c++) {
            matchedConserve |= rule.conserven[_c] === currentConserve;
            newConserven.push(rule.conserven[_c]);
          }
          rule.tickets.push(ticket);
        }
      }

      matched &= currentConserve === '0' ? true : matchedConserve;

      // remember unmatched or already conserved tickets in currentConserve
      if (!matched || currentConserve !== '0') {
        getConserve(remainingConserven, currentConserve).push(ticket);
      } else if (currentConserve === '0') {
        // remember ticket of default conserve in all conserven regarding all
        // matched rules
        newConserven.distinct();
        for (var i = 0; i < newConserven.length; i++) {
          getConserve(remainingConserven, newConserven[i]).push(ticket);
        }
      }

      return matched;
    };

    var conserven = [ tickets ];

    $('td[data-kb-col]', _innerState.kanbanboard).each(function(i, e) {

      var remainingConserven = Array();

      // get rules for this cell
      var _a = getArea(e);
      var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
      var matchedTickets = rulematrixCell.tickets;
      var rules = rulematrixCell.rules;
      if (!rules) {
        return;
      }

      // iterate over conserven
      for ( var conserve in conserven) {
        if (!conserven.hasOwnProperty(conserve)) {
          continue;
        }
        // iterate over tickets
        for (var t = 0; t < conserven[conserve].length; t++) {
          var ticket = conserven[conserve][t];

          // apply rules for this ticket
          var matched = fire(rules, ticket, remainingConserven, conserve);

          // remember matched tickets
          if (matched) {
            matchedTickets.push(ticket);
          }
        }
      }

      // sort tickets
      matchedTickets.distinct();
      for (var i = rules.length - 1; i >= 0; i--) {
        if (rules[i].sort) {
          matchedTickets.sort(rules[i].sort);
        }
      }
      conserven = remainingConserven;
    });
    return conserven[0];
  };

  var dropHandler = function(ticketId, target, source) {

    var _at = getArea(target);
    var _as = getArea(source);
    if (_at.row === _as.row && _at.col === _as.col) {
      return false;
    }

    var ticket = null;
    for (var i = 0; ticket == null && i < _innerState.tickets.length; i++) {
      if (_innerState.ticketSelector(ticketId, _innerState.tickets[i])) {
        ticket = _innerState.tickets[i];
      }
    }
    if (!ticket) {
      return false;
    }

    var rules = _innerState.rulematrix[_at.row][_at.col].rules;

    var transitions = ArrayList();
    var next = true;
    for (var i = rules.length - 1; next && i >= 0; i--) {
      next = rules[i].transition(ticket, transitions, rules[i].negate);
    }

    var success = _innerState.dropAction(ticket, transitions);
    return success;
  };

  // load kanbanboard as html from url and init html and rules
  this.load = function(url, rules, callbacks) {
    var that = this;
    $.ajax({
      url : url,
      async : false,
      cache : false,
      success : function(html) {
        that.init(html, rules, callbacks);
      },
      error : function(e) {
        console.log(e)
      }
    });
  };

  // initializes kanbanboard from html and derives rulematrix with rules, limits
  // and templates for each cell
  this.init = function(html, rules, callbacks) {
    _innerState.rules = rules;
    _innerState.callbacks = callbacks;
    _innerState.kanbanboard = $(html);
    _innerState.rulematrix = initRulematrix(_innerState.kanbanboard, _innerState.rules);
  };

  // populates board with given tickets, returns unpopulated tickets
  // (unconsumed)
  this.populate = function(tickets, validate) {
    this.reset();
    _innerState.tickets = tickets;
    tickets = applyTickets(tickets);
    if (validate) {
      this.validate();
    }
    if (_innerState.callbacks) {
      this.triggerCallbacks();
    }

    return tickets;
  };

  this.getTicketsFromCell = function(row, col) {
    var result = ArrayList();
    result.addAll(_innerState.rulematrix[row][col].tickets);
    return result;
  };

  this.getTicketsFromArea = function(area) {
    var total = ArrayList();
    for (var row = area.from.row; row <= area.to.row; row++) {
      for (var col = area.from.col; col <= area.to.col; col++) {
        total.addAll(_innerState.rulematrix[row][col].tickets);
      }
    }
    return total;
  };

  // applies wips and writes them on board
  this.validate = function() {
    var that = this;
    $('th[data-kb-limit]', _innerState.kanbanboard).each(function(i, e) {
      var _a = getArea(e);
      var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
      if (!rulematrixCell.limitArea) {
        return;
      }

      var total = that.getTicketsFromArea(rulematrixCell.limitArea);
      total.distinct();

      var style;
      if (total.length >= rulematrixCell.limit_range[0] && total.length <= rulematrixCell.limit_range[1]) {
        style = 'wip_ok';
      } else if (total.length < rulematrixCell.limit_range[0]) {
        style = 'wip_low';
      } else if (total.length > rulematrixCell.limit_range[1]) {
        style = 'wip_high';
      } else {
        style = 'wip_unknown';
      }

      $(e).addClass(style);
      var wipstatement = wipStatement($(e).attr('data-kb-limit'), total.length);
      if (wipstatement) {
        $(e).html('<nobr class="' + style + ' wip">' + wipstatement + '</nobr>');
      }
    });
  };

  this.triggerCallbacks = function() {
    if (!_innerState.callbacks) {
      throw 'callbacks not initialized!';
    }
    var that = this;
    $('th[data-kb-callbacks]', _innerState.kanbanboard).each(function(i, e) {
      var _a = getArea(e);
      var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
      if (!rulematrixCell.callbacks || !rulematrixCell.callbacksArea) {
        return;
      }

      var total = that.getTicketsFromArea(rulematrixCell.callbacksArea);
      var callback = rulematrixCell.callbacks.split(',');
      for (var i = 0; i < callback.length; i++) {
        _innerState.callbacks[callback].perform(total, e, _innerState.kanbanboard);
      }
    });
  };

  // remove all tickets from kanbanboard
  this.reset = function() {
    if (_innerState.callbacks) {
      $('th[data-kb-callbacks]', _innerState.kanbanboard).each(function(i, e) {
        var _a = getArea(e);
        var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
        _innerState.callbacks[rulematrixCell.callbacks].reset(e, _innerState.kanbanboard);
      });
    }

    $('th[data-kb-limit]', _innerState.kanbanboard).each(function(i, e) {
      $(e).removeClass('wip_low wip_ok wip_high wip_unknown');
      var wipstatement = wipStatement($(e).attr('data-kb-limit'));
      if (wipstatement) {
        $(e).html('<nobr class="wip">' + wipstatement + '</nobr>');
      }
    });

    $('td[data-kb-col]', _innerState.kanbanboard).each(function(i, e) {
      $(e).html('');
    });

    _innerState.tickets = null;
    for (var row = 0; row < _innerState.rulematrix.length; row++) {
      var rulematrixRow = _innerState.rulematrix[row];
      for (var col = 0; col < rulematrixRow.length; col++) {
        var rulematrixCell = rulematrixRow[col];
        rulematrixCell.tickets = ArrayList();
        for (var r = 0; rulematrixCell.rules !== null && r < rulematrixCell.rules.length; r++) {
          rulematrixCell.rules[r].tickets = ArrayList();
        }
      }
    }
  };

  // create html for current board (incl. current state) and add it to
  // jquery-selector
  this.renderboard = function(selector, templates) {
    $('td[data-kb-col]', _innerState.kanbanboard).each(function(i, e) {
      var _a = getArea(e);
      var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
      var renderer;
      if (!rulematrixCell.template || !templates || !templates[rulematrixCell.template]) {
        renderer = DEFAULT_RENDERER;
      } else {
        renderer = templates[rulematrixCell.template];
      }
      for (var t = 0; t < rulematrixCell.tickets.length; t++) {
        try {
          $(e).append(renderer(rulematrixCell.tickets[t], rulematrixCell.styles));
        } catch (exception) {
          throw 'Exception during rendering ticket <' + t + '> with renderer <' + rulematrixCell.template + '>:' + exception;
        }
      }
    });

    $(selector).html(_innerState.kanbanboard);

    // drag & drop support
    if (_innerState.dropAction && _innerState.ticketSelector) {
      $('td[data-kb-col] > [data-kb-ticket-id]', _innerState.kanbanboard).draggable({
        helper : 'clone',
        opacity : 0.66,
        snap : 'outer',
        cursor : 'move'
      });

      $('td[data-kb-col]', _innerState.kanbanboard).droppable({
        drop : function(event, ui) {
          var ticketId = ui.draggable.attr('data-kb-ticket-id');
          var success = dropHandler(ticketId, $(this), $(ui.draggable).closest('td[data-kb-col]'));
          if (success) {
            $(this).append(ui.draggable);
            ui.draggable.addClass('data-kb-dragged');
          }
        }
      });
    }
  };

  // set default template for rendering tickets
  this.setDefaultTemplate = function(defaultTemplate) {
    _innerState.defaultTemplate = defaultTemplate;
  };

  // adds or removes debug information for each cell as title-attribute
  // (tooltip)
  this.debug = function(activate) {
    if (activate) {
      // populate debug information
      $('th[data-kb-col],td[data-kb-col]', _innerState.kanbanboard).each(
          function(i, e) {
            // coordinates
            var _a = getArea(e);

            var rulenames = Array();
            var styles = Array();

            // get rules for this cell
            var rules = _innerState.rulematrix[_a.row][_a.col].rules;
            if (rules) {
              for (var i = 0; i < rules.length; i++) {
                rulenames.push((rules[i].negate ? '!' : '') + rules[i].name + '[' + (rules[i].last ? 'L' : 'l') + (rules[i].sort ? 'S' : 's') + (rules[i].conserven !== null ? 'C=' + JSON.stringify(rules[i].conserven) : 'c') + ']');
                if (!rules[i].negate && rules[i].style !== null) {
                  styles.push(rules[i].style);
                }
              }
              $(e).attr('data-kb-debug-rule', String(rulenames));
            }

            var template = _innerState.rulematrix[_a.row][_a.col].template;
            var limit = _innerState.rulematrix[_a.row][_a.col].limit;
            var limitArea = _innerState.rulematrix[_a.row][_a.col].limitArea;

            // set debug info as tooltip
            var s = 'DEBUG: ' + ($(e).is('th') ? 'TH' : 'TD') + '(' + _a.row + '|' + _a.col + ')' + ', RULES: ' + JSON.stringify(rulenames) + ', LIMIT: ' + limit + (limit ? ' ' + JSON.stringify(limitArea) : '') + ', TEMPLATE: ' + template + ', STYLES: '
                + JSON.stringify(styles);
            $(e).attr('title', s);
          });
    } else {
      $('td[data-kb-col],th[data-kb-col]', _innerState.kanbanboard).each(function(i, e) {
        var title = $(e).attr('title');
        if (title && title.startsWith('DEBUG:')) {
          $(e).removeAttr('title');
        }
      });
    }
  };

  this.compile = function() {
    $('th[data-kb-col],td[data-kb-col]', _innerState.kanbanboard).each(
      function(i, e) {
        // coordinates
        var _a = getArea(e);

        var $_e = $(e);
        var isHeader = $_e.is('th');

        // 1. set rules for this cell
        var rules = _innerState.rulematrix[_a.row][_a.col].rules;
        if (rules && !isHeader) {
          var rulenames = '';
          for (var i = 0; i < rules.length; i++) {
            rulenames += (rules[i].negate ? '!' : '') + rules[i].name + ',';
          }
          $_e.attr('data-kb-rules', rulenames + 'LAST');
        } else {
          $_e.removeAttr('data-kb-rules');
        }

        // 2. Set template for cell
        var template = _innerState.rulematrix[_a.row][_a.col].template;
        if (template && !isHeader) {
          $_e.attr('data-kb-template', template);
        } else {
          $_e.removeAttr('data-kb-template');
        }

        // 3. Set limit for cell
        var limit = _innerState.rulematrix[_a.row][_a.col].limit;
        var limitArea = _innerState.rulematrix[_a.row][_a.col].limitArea;
        if (limit && limitArea && isHeader) {
          $_e.attr('data-kb-limit', limit);
          $_e.attr('data-kb-limit-area', limitArea.from.row + ',' + limitArea.from.col + ',' + limitArea.to.row + ',' + limitArea.to.col);
        } else {
          $_e.removeAttr('data-kb-limit');
          $_e.removeAttr('data-kb-limit-area');
        }

        // 4. Set callbacks
        var callbacks = _innerState.rulematrix[_a.row][_a.col].limit;
        var callbacksArea = _innerState.rulematrix[_a.row][_a.col].limitArea;
        if (callbacks && callbacksArea && isHeader) {
          $_e.attr('data-kb-callbacks', callbacks);
          $_e.attr('data-kb-callbacks-area', callbacksArea.from.row + ',' + callbacksArea.from.col + ',' + callbacksArea.to.row + ',' + callbacksArea.to.col);
        } else {
          $_e.removeAttr('data-kb-callbacks');
          $_e.removeAttr('data-kb-callbacks-area');
        }

        // remove debug information
        var title = $_e.attr('title');
        if (title && title.startsWith('DEBUG:')) {
          $_e.removeAttr('title');
        }
      }
    );
  }

  this.setDropAction = function(action) {
    _innerState.dropAction = action;
  };

  this.removeDropAction = function() {
    _innerState.dropAction = null;
  };

  this.setTicketSelector = function(selector) {
    _innerState.ticketSelector = selector;
  };

}