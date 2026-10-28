// Shared logic used by both the map page and tools/gen-mermaid.js.
// Defines window.SMLIB = { enrich, risksFor, packMarkdown, mdToHtml }.
(function (root) {
  'use strict';
  const KIND_LABEL = { app: 'Power App', flow: 'Flow', tool: 'HTML tool', dash: 'Dashboard', store: 'Data store', excel: 'Excel', doc: 'Document', external: 'External', agent: 'AI agent' };
  const ACTIVE = ['live', 'testing', 'built'];

  // Merge ownership defaults into each node
  function enrich(M) {
    const o = M.ownership || {};
    M.nodes.forEach(n => {
      const byKind = (o.byKind || {})[n.kind] || {};
      const over = (o.nodes || {})[n.id] || {};
      n.owner = over.owner || byKind.owner || n.owner || o.defaultOwner || '';
      n.runsAs = over.runsAs || byKind.runsAs || n.runsAs || '';
      n.ownerNote = over.note || '';
    });
    return M;
  }

  // Stated risks plus the automatic single-account rule for active flows
  function risksFor(M, n) {
    const list = ((M.risks || {})[n.id] || []).slice();
    if (n.kind === 'flow' && n.runsAs && ACTIVE.includes(n.status)) list.unshift('Runs under one person\'s account: stops if that account loses access or leaves');
    return list;
  }

  const fmtList = a => (a && a.length ? a.map(x => '- ' + x).join('\n') : '- None recorded');
  const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\n/g, ' ');

  function packMarkdown(M, W, D, sysId) {
    const sys = M.systems.find(s => s.id === sysId);
    if (!sys) return '';
    const nodes = M.nodes.filter(n => n.system === sysId);
    const ids = new Set(nodes.map(n => n.id));
    const byId = Object.fromEntries(M.nodes.map(n => [n.id, n]));
    const edges = M.edges.filter(e => byId[e.from] && byId[e.to]);
    const inbound = edges.filter(e => ids.has(e.to) && !ids.has(e.from));
    const outbound = edges.filter(e => ids.has(e.from) && !ids.has(e.to));
    const logs = ((W && W.entries) || []).filter(e => e.system === sysId).sort((a, b) => a.date < b.date ? -1 : 1);
    const latest = logs[logs.length - 1];
    const decs = ((D && D.items) || []).filter(d => d.system === sysId);
    const risks = nodes.map(n => ({ n, r: risksFor(M, n) })).filter(x => x.r.length);
    const L = [];

    L.push('# Handover pack: ' + sys.name);
    L.push('');
    L.push('**Department:** ' + sys.dept + '  ');
    L.push('**Generated:** ' + (M.updated || '') + ' from the solution map  ');
    L.push('**Components:** ' + nodes.length + ' · **Decisions:** ' + decs.length + ' · **Open questions:** ' + decs.filter(d => d.status === 'open').length);
    L.push('');

    L.push('## Where it stands');
    if (latest) {
      L.push('');
      L.push('Last worked on **' + latest.date + '**' + (latest.backfill ? ' (reconstructed from earlier notes)' : '') + '.');
      L.push('');
      L.push(latest.summary);
      L.push('');
      L.push('**Left off:** ' + (latest.leftOff || 'Not recorded'));
      L.push('');
      L.push('**Next steps**');
      L.push(fmtList(latest.next));
      L.push('');
      const open = logs.flatMap(e => e.open || []);
      L.push('**Waiting on someone**');
      L.push(fmtList([...new Set(open)]));
    } else {
      L.push('', 'No work log entries yet.');
    }
    L.push('');

    L.push('## Components');
    L.push('');
    L.push('| Component | Type | Status | Owner | Runs as | Where | What it does |');
    L.push('|---|---|---|---|---|---|---|');
    nodes.forEach(n => L.push('| ' + [n.name, KIND_LABEL[n.kind] || n.kind, n.status, n.owner, n.runsAs || '', n.where || '', n.summary || ''].map(cell).join(' | ') + ' |'));
    L.push('');

    L.push('## Connections to other systems');
    L.push('');
    L.push('**Comes in from**');
    L.push(fmtList(inbound.map(e => byId[e.from].name + ' → ' + byId[e.to].name + (e.label ? ' (' + e.label + ')' : '') + (e.kind === 'planned' ? ' [planned]' : ''))));
    L.push('');
    L.push('**Goes out to**');
    L.push(fmtList(outbound.map(e => byId[e.from].name + ' → ' + byId[e.to].name + (e.label ? ' (' + e.label + ')' : '') + (e.kind === 'planned' ? ' [planned]' : ''))));
    L.push('');

    L.push('## Risks');
    L.push('');
    if (risks.length) risks.forEach(x => { L.push('**' + x.n.name + '**'); L.push(fmtList(x.r)); L.push(''); });
    else L.push('- None recorded', '');

    L.push('## Decisions');
    L.push('');
    if (decs.length) {
      decs.forEach(d => {
        L.push('### ' + d.id + ' ' + d.title + (d.status !== 'decided' ? ' (' + d.status + ')' : ''));
        L.push('');
        L.push(d.decision);
        if (d.why) { L.push(''); L.push('*Why:* ' + d.why); }
        if (d.consequences) { L.push(''); L.push('*Consequence:* ' + d.consequences); }
        L.push('');
      });
    } else L.push('- None recorded', '');

    L.push('## Work log');
    L.push('');
    if (logs.length) logs.slice().reverse().forEach(e => {
      L.push('### ' + e.date + (e.backfill ? ' (backfilled)' : ''));
      L.push('');
      L.push(e.summary);
      L.push('');
    });
    else L.push('- No entries yet', '');

    return L.join('\n');
  }

  // Minimal Markdown renderer for the pack view: headings, bold/italic, lists, tables, paragraphs
  function mdToHtml(md) {
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    const lines = md.split('\n');
    let html = '', i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; html += '<h' + n + '>' + inline(l.slice(n + 1)) + '</h' + n + '>'; i++; continue; }
      if (/^- /.test(l)) { html += '<ul>'; while (i < lines.length && /^- /.test(lines[i])) { html += '<li>' + inline(lines[i].slice(2)) + '</li>'; i++; } html += '</ul>'; continue; }
      if (/^\|/.test(l)) {
        const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        const split = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        html += '<div class="tbl"><table><thead><tr>' + split(rows[0]).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.slice(2).map(r => '<tr>' + split(r).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if (l.trim() === '') { i++; continue; }
      const para = []; while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3} |- |\|)/.test(lines[i])) { para.push(lines[i].replace(/ {2}$/, '')); i++; }
      html += '<p>' + para.map(inline).join('<br>') + '</p>';
    }
    return html;
  }

  root.SMLIB = { enrich, risksFor, packMarkdown, mdToHtml, KIND_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
