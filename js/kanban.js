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
export function Kanban() {
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

  var escapeHtml = function(value) {
    return String(value).replace(/[&<>"']/g, function(character) {
      return {
        '&' : '&amp;',
        '<' : '&lt;',
        '>' : '&gt;',
        '"' : '&quot;',
        "'" : '&#39;'
      }[character];
    });
  };

  var DEFAULT_RENDERER = function(ticket, styles) {
    var values = typeof ticket == 'object' ? Object.keys(ticket).slice(0, 2).map(function(key) {
      return escapeHtml(ticket[key]);
    }).join(' ') : escapeHtml(ticket);
    return '<span style="' + escapeHtml((styles || []).join(' ')) + '">' + values + '</span> ';
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
    var row = parseInt(e.getAttribute('data-kb-row'));
    var col = parseInt(e.getAttribute('data-kb-col'));
    var _rowspan = e.getAttribute('rowspan');
    _rowspan = _rowspan ? parseInt(_rowspan) : 1;
    var _colspan = e.getAttribute('colspan');
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
    dropObserver : null,
    ticketSelector : null,
    pointerDragEnabled : false
  };
  var dropBoundCells = new WeakSet();

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
        kanbanboard.querySelectorAll('tr').forEach(function(tr) {
          Array.from(tr.children).forEach(function(e) {
            if (!e.matches('th[data-kb-col],td[data-kb-col]')) {
              return;
            }
            var result = ArrayList();

            // coordinates and area
            var _a = getArea(e);

            // seek rows upwards (fromTopLeft = false), downwards (fromTopLeft = true)
            var last = that.CONTINUE;
            for (var _r = _a.row; _r >= 0 && _r < rulematrix.length && last === that.CONTINUE; (fromTopLeft ? _r++ : _r--)) {
              last = collector(_r, _a.col, (fromTopLeft ? _r < _a.row + _a.rowspan : _r === _a.row), rulematrix[_r][_a.col], rules, result);
            }
            // seek cols to leftwards (fromTopLeft = false), rightwards (fromTopLeft = true)
            last = that.LAST_BOTH === last ? that.LAST_BOTH : that.CONTINUE;
            for (var _c = _a.col + (fromTopLeft ? 1 : -1); _c >= 0 && _c < rulematrix[0].length && last === that.CONTINUE; (fromTopLeft ? _c++ : _c--)) {
              last = collector(_a.row, _c, (fromTopLeft ? _c < _a.col + _a.colspan : false), rulematrix[_a.row][_c], rules, result);
            }

            apply(rulematrix[_a.row][_a.col], result);
          });
        });
      }
    };

    // basic init
    var init = function(kanbanboard) {
      var rulematrix = ArrayList();
      var rows = kanbanboard.querySelectorAll('tr');
      var total_rows = rows.length;
      var total_cols = 0;
      Array.from(rows[0].children).filter(function(e) {
        return e.matches('th,td');
      }).forEach(function(e) {
        var _colspan = e.getAttribute('colspan');
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
      kanbanboard.querySelectorAll('tr').forEach(function(er) {
        row++;
        Array.from(er.children).forEach(function(ec) {
          if (!ec.matches('th,td')) {
            return;
          }

          var rulematrixCell = {
            matcher : ec.getAttribute('data-kb-rules'),
            limit : ec.getAttribute('data-kb-limit'),
            limitArea : ec.getAttribute('data-kb-limit-area'),
            callbacks : ec.getAttribute('data-kb-callbacks'),
            callbacksArea : ec.getAttribute('data-kb-callbacks-area'),
            template : ec.getAttribute('data-kb-template'),
            isHeader : ec.matches('th'),
            rules : null,
            styles : null,
            tickets : ArrayList()
          };

          var _rowspan = ec.getAttribute('rowspan');
          _rowspan = _rowspan ? parseInt(_rowspan) : 1;

          var _colspan = ec.getAttribute('colspan');
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
          ec.setAttribute('data-kb-row', String(row));
          ec.setAttribute('data-kb-col', String(1 + _i - _colspan));
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
        } else if (!self && rulematrixCell[what] !== null && typeof rulematrixCell[what] !== 'undefined') {
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

    _innerState.kanbanboard.querySelectorAll('td[data-kb-col]').forEach(function(e) {

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
    return conserven[0] || [];
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

  var completeDrop = function(ticketId, ticketElement, target, source) {
    if (!ticketElement || !source || !dropHandler(ticketId, target, source)) {
      return false;
    }
    target.appendChild(ticketElement);
    ticketElement.classList.add('data-kb-dragged');
    if (_innerState.dropObserver) {
      _innerState.dropObserver(ticketId, source, target);
    }
    return true;
  };

  // load kanbanboard as html from url and init html and rules
  this.load = async function(url, rules, callbacks) {
    var response = await fetch(url, { cache : 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load kanban board: ' + response.status + ' ' + response.statusText);
    }
    this.init(await response.text(), rules, callbacks);
    return this;
  };

  // initializes kanbanboard from html and derives rulematrix with rules, limits
  // and templates for each cell
  this.init = function(html, rules, callbacks) {
    _innerState.rules = rules;
    _innerState.callbacks = callbacks;
    if (typeof html === 'string') {
      var parsed = new DOMParser().parseFromString(html, 'text/html');
      _innerState.kanbanboard = parsed.querySelector('table');
    } else if (html && html.matches && html.matches('table')) {
      _innerState.kanbanboard = html.cloneNode(true);
    } else if (html && html.querySelector) {
      var table = html.querySelector('table');
      _innerState.kanbanboard = table ? table.cloneNode(true) : null;
    }
    if (!_innerState.kanbanboard) {
      throw new Error('Kanban board markup must contain a table.');
    }
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

  this.getBoardElement = function() {
    return _innerState.kanbanboard;
  };

  this.getTemplateFromCell = function(row, col) {
    return _innerState.rulematrix[row][col].template;
  };

  this.getStylesFromCell = function(row, col) {
    return _innerState.rulematrix[row][col].styles.slice();
  };

  this.getRuleNamesFromCell = function(row, col) {
    return _innerState.rulematrix[row][col].rules.map(function(rule) {
      return (rule.negate ? '!' : '') + rule.name;
    });
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
    _innerState.kanbanboard.querySelectorAll('th[data-kb-limit]').forEach(function(e) {
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

      e.classList.add(style);
      var wipstatement = wipStatement(e.getAttribute('data-kb-limit'), total.length);
      if (wipstatement) {
        e.innerHTML = '<nobr class="' + style + ' wip">' + wipstatement + '</nobr>';
      }
    });
  };

  this.triggerCallbacks = function() {
    if (!_innerState.callbacks) {
      throw 'callbacks not initialized!';
    }
    var that = this;
    _innerState.kanbanboard.querySelectorAll('th[data-kb-callbacks]').forEach(function(e) {
      var _a = getArea(e);
      var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
      if (!rulematrixCell.callbacks || !rulematrixCell.callbacksArea) {
        return;
      }

      var total = that.getTicketsFromArea(rulematrixCell.callbacksArea);
      rulematrixCell.callbacks.split(',').forEach(function(name) {
        _innerState.callbacks[name].perform(total, e, _innerState.kanbanboard);
      });
    });
  };

  // remove all tickets from kanbanboard
  this.reset = function() {
    if (_innerState.callbacks) {
      _innerState.kanbanboard.querySelectorAll('th[data-kb-callbacks]').forEach(function(e) {
        var _a = getArea(e);
        var rulematrixCell = _innerState.rulematrix[_a.row][_a.col];
        (rulematrixCell.callbacks || '').split(',').filter(Boolean).forEach(function(name) {
          var callback = _innerState.callbacks[name];
          if (callback && callback.reset) {
            callback.reset(e, _innerState.kanbanboard);
          }
        });
      });
    }

    _innerState.kanbanboard.querySelectorAll('th[data-kb-limit]').forEach(function(e) {
      e.classList.remove('wip_low', 'wip_ok', 'wip_high', 'wip_unknown');
      var wipstatement = wipStatement(e.getAttribute('data-kb-limit'));
      if (wipstatement) {
        e.innerHTML = '<nobr class="wip">' + wipstatement + '</nobr>';
      }
    });

    _innerState.kanbanboard.querySelectorAll('td[data-kb-col]').forEach(function(e) {
      e.replaceChildren();
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

  // Create the current board and attach it to a DOM element.
  this.renderboard = function(selector, templates) {
    _innerState.kanbanboard.querySelectorAll('td[data-kb-col]').forEach(function(e) {
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
          e.insertAdjacentHTML('beforeend', renderer(rulematrixCell.tickets[t], rulematrixCell.styles));
        } catch (exception) {
          throw 'Exception during rendering ticket <' + t + '> with renderer <' + rulematrixCell.template + '>:' + exception;
        }
      }
    });

    var target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!target) {
      throw new Error('Kanban render target was not found.');
    }
    target.replaceChildren(_innerState.kanbanboard);

    this.enableDragAndDrop();
  };

  this.enableDragAndDrop = function() {
    if (!_innerState.dropAction || !_innerState.ticketSelector) {
      return;
    }
    _innerState.kanbanboard.querySelectorAll('td[data-kb-col] > [data-kb-ticket-id]').forEach(function(ticketElement) {
      ticketElement.draggable = true;
      ticketElement.addEventListener('dragstart', function(event) {
        event.dataTransfer.setData('text/plain', ticketElement.getAttribute('data-kb-ticket-id'));
      });
    });

    _innerState.kanbanboard.querySelectorAll('td[data-kb-col]').forEach(function(cell) {
      if (dropBoundCells.has(cell)) {
        return;
      }
      dropBoundCells.add(cell);
      cell.addEventListener('dragover', function(event) {
        event.preventDefault();
      });
      cell.addEventListener('drop', function(event) {
        event.preventDefault();
        var ticketId = event.dataTransfer.getData('text/plain');
        var ticketElement = Array.from(_innerState.kanbanboard.querySelectorAll('[data-kb-ticket-id]')).find(function(element) {
          return element.getAttribute('data-kb-ticket-id') === ticketId;
        });
        var source = ticketElement && ticketElement.closest('td[data-kb-col]');
        completeDrop(ticketId, ticketElement, cell, source);
      });
    });
  };

  this.enablePointerDragAndDrop = function() {
    if (_innerState.pointerDragEnabled || !_innerState.dropAction || !_innerState.ticketSelector) {
      return;
    }

    var board = _innerState.kanbanboard;
    var drag = null;
    board.querySelectorAll('td[data-kb-col] > [data-kb-ticket-id]').forEach(function(ticketElement) {
      ticketElement.draggable = false;
      ticketElement.setAttribute('data-kb-draggable', 'true');
    });

    board.addEventListener('pointerdown', function(event) {
      if (event.button !== 0) return;
      var ticketElement = event.target.closest('td[data-kb-col] > [data-kb-ticket-id]');
      if (!ticketElement) return;
      drag = {
        id: ticketElement.getAttribute('data-kb-ticket-id'),
        element: ticketElement,
        source: ticketElement.closest('td[data-kb-col]'),
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
        active: false
      };
    });

    board.addEventListener('pointermove', function(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.active = true;
      event.preventDefault();
      board.ownerDocument.documentElement.classList.add('kanban-pointer-dragging');
      drag.element.classList.add('is-dragging');
      board.querySelectorAll('.is-drop-target').forEach(function(cell) {
        cell.classList.remove('is-drop-target');
      });
      var hovered = board.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      var target = hovered && hovered.closest('td[data-kb-col]');
      if (target) target.classList.add('is-drop-target');
    });

    var finishPointerDrag = function(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      var currentDrag = drag;
      drag = null;
      board.ownerDocument.documentElement.classList.remove('kanban-pointer-dragging');
      currentDrag.element.classList.remove('is-dragging');
      board.querySelectorAll('.is-drop-target').forEach(function(cell) {
        cell.classList.remove('is-drop-target');
      });
      if (!currentDrag.active) return;

      var hovered = board.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      var target = hovered && hovered.closest('td[data-kb-col]');
      if (target && target !== currentDrag.source) {
        completeDrop(currentDrag.id, currentDrag.element, target, currentDrag.source);
      }
    };

    board.addEventListener('pointerup', finishPointerDrag);
    board.addEventListener('pointercancel', finishPointerDrag);
    _innerState.pointerDragEnabled = true;
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
      _innerState.kanbanboard.querySelectorAll('th[data-kb-col],td[data-kb-col]').forEach(
          function(e) {
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
              e.setAttribute('data-kb-debug-rule', String(rulenames));
            }

            var template = _innerState.rulematrix[_a.row][_a.col].template;
            var limit = _innerState.rulematrix[_a.row][_a.col].limit;
            var limitArea = _innerState.rulematrix[_a.row][_a.col].limitArea;

            // set debug info as tooltip
            var s = 'DEBUG: ' + (e.matches('th') ? 'TH' : 'TD') + '(' + _a.row + '|' + _a.col + ')' + ', RULES: ' + JSON.stringify(rulenames) + ', LIMIT: ' + limit + (limit ? ' ' + JSON.stringify(limitArea) : '') + ', TEMPLATE: ' + template + ', STYLES: '
                + JSON.stringify(styles);
            e.setAttribute('title', s);
          });
    } else {
      _innerState.kanbanboard.querySelectorAll('td[data-kb-col],th[data-kb-col]').forEach(function(e) {
        var title = e.getAttribute('title');
        if (title && title.startsWith('DEBUG:')) {
          e.removeAttribute('title');
        }
      });
    }
  };

  this.compile = function() {
    _innerState.kanbanboard.querySelectorAll('th[data-kb-col],td[data-kb-col]').forEach(
      function(e) {
        // coordinates
        var _a = getArea(e);

        var isHeader = e.matches('th');

        // 1. set rules for this cell
        var rules = _innerState.rulematrix[_a.row][_a.col].rules;
        if (rules && !isHeader) {
          var rulenames = '';
          for (var i = 0; i < rules.length; i++) {
            rulenames += (rules[i].negate ? '!' : '') + rules[i].name + ',';
          }
          e.setAttribute('data-kb-rules', rulenames + 'LAST');
        } else {
          e.removeAttribute('data-kb-rules');
        }

        // 2. Set template for cell
        var template = _innerState.rulematrix[_a.row][_a.col].template;
        if (template && !isHeader) {
          e.setAttribute('data-kb-template', template);
        } else {
          e.removeAttribute('data-kb-template');
        }

        // 3. Set limit for cell
        var limit = _innerState.rulematrix[_a.row][_a.col].limit;
        var limitArea = _innerState.rulematrix[_a.row][_a.col].limitArea;
        if (limit && limitArea && isHeader) {
          e.setAttribute('data-kb-limit', limit);
          e.setAttribute('data-kb-limit-area', limitArea.from.row + ',' + limitArea.from.col + ',' + limitArea.to.row + ',' + limitArea.to.col);
        } else {
          e.removeAttribute('data-kb-limit');
          e.removeAttribute('data-kb-limit-area');
        }

        // 4. Set callbacks
        var callbacks = _innerState.rulematrix[_a.row][_a.col].callbacks;
        var callbacksArea = _innerState.rulematrix[_a.row][_a.col].callbacksArea;
        if (callbacks && callbacksArea && isHeader) {
          e.setAttribute('data-kb-callbacks', callbacks);
          e.setAttribute('data-kb-callbacks-area', callbacksArea.from.row + ',' + callbacksArea.from.col + ',' + callbacksArea.to.row + ',' + callbacksArea.to.col);
        } else {
          e.removeAttribute('data-kb-callbacks');
          e.removeAttribute('data-kb-callbacks-area');
        }

        // remove debug information
        var title = e.getAttribute('title');
        if (title && title.startsWith('DEBUG:')) {
          e.removeAttribute('title');
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

  this.setDropObserver = function(observer) {
    _innerState.dropObserver = observer;
  };

}