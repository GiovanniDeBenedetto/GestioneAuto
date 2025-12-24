// statistics page script
var rows = [];
$(function(){
  function loadConfigSync(){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'js/config.json', false);
    try{ xhr.send(null); if(xhr.status===200||xhr.status===0) return JSON.parse(xhr.responseText);}catch(e){console.error('Failed to load config.json', e);} return null;
  }
  var cfg = loadConfigSync();
  const API_URL = (cfg && cfg.apiEndpoint) ? cfg.apiEndpoint : "https://script.google.com/macros/s/AKfycbxkWY9YEU3Ip_JN_Ag1zIZ3-8HaXaktTsW0nOyZOt0I3h_XqXS2gSbGPeGa21CQebwR/exec";
  const token = localStorage.getItem('sk_token') || ((cfg && cfg.sk_token)?cfg.sk_token:'Stellina');
  const username = localStorage.getItem('sk_username');
  if(!username){
    window.location.href = 'login.html';
    return;
  }

  function fetchData(){
    $('#records-table tbody').empty();
    $('#chart-annual').hide();
    $.ajax({
      url: API_URL,
      method: 'GET',
      dataType: 'json',
      success: function(res){
        if(!res || !res.rows) return;
        rows = res.rows.reverse(); // most recent first
        console.log('Fetched rows', rows);
        //populateTable(rows);
        applyFilters(rows);
        //renderChart(rows);
      },
      error: function(){ alert('Errore durante il caricamento dati.'); }
    });
  }

  function populateTable(rows){
    const tbody = $('#records-table tbody');
    tbody.empty();
    rows.forEach(r=>{
      const date = new Date(r.date);
      const d = isNaN(date.getTime()) ? r.date : date.toLocaleDateString();
      const tr = $('<tr>');
      tr.append('<td>'+d+'</td>');
      tr.append('<td>'+ (r.macchina||'') +'</td>');
      tr.append('<td>'+ (r.autista||'') +'</td>');
      tr.append('<td>'+ (r.km||'') +'</td>');
      tr.append('<td>'+ (r.eur||'') +'</td>');
      tr.append('<td>'+ (r.litri||'') +'</td>');
      const eurpl = (r.eur_per_l && typeof r.eur_per_l !== 'undefined' && r.eur_per_l !== null && r.eur_per_l !== "" && !isNaN(r.eur_per_l)) ? parseFloat(r.eur_per_l).toFixed(3) : '';
      tr.append('<td>'+ eurpl +'</td>');
      tr.append('<td>'+ (r.benzina ? '<img src="img/benzina.png" class="table-png">' :'') +'</td>');
      // file column: if r.file is a url, render link
      if(r.file){
        tr.append('<td><a href="'+r.file+'" target="_blank" rel="noopener"><img src="img/file.png" class="table-png"></a></td>');
      } else {
        tr.append('<td></td>');
      }
      tr.append('<td>'+ (r.note||'') +'</td>');
      const btn = $('<img src="img/cestino.png" class="table-png" title="Elimina record">');
      btn.on('click', function(){
        if(!confirm('Confermi eliminazione?')) return;
        // Attempt to delete via API - the backend must support deletion by id
        $.ajax({
          url: API_URL,
          method: 'GET',
          //contentType: 'json',
          data: { token: token, action: 'delete', id: r.id , database: 'database' },
          success: function(resp){
            console.log('DELETE resp', resp);
            // if backend returns success, remove row, else show message
            if(resp && resp.success){
              tr.remove();
            } else {
              alert("Richiesta inviata. Se l'API non supporta delete, aggiorna manualmente lo sheet.");
              fetchData();
            }
          },
          error: function(){
            alert('Errore durante la richiesta di cancellazione. Controlla la console.');
          }
        });
      });
      tr.append($('<td>').append(btn));
      tbody.append(tr);
    });
    // Fill filters
    const machinesFromRows = Array.from(new Set(rows.map(r=>r.macchina).filter(Boolean)));
    const machines = (cfg && cfg.macchine && cfg.macchine.length) ? cfg.macchine : machinesFromRows;
    const drivers = Array.from(new Set(rows.map(r=>r.autista).filter(Boolean)));
    const fm = $('#filter-machine').empty().append('<option>All</option>');
    machines.forEach(m=>fm.append('<option>'+m+'</option>'));
    const fd = $('#filter-driver').empty().append('<option>All</option>');
    drivers.forEach(d=>fd.append('<option>'+d+'</option>'));
  }

  function renderChart(rows, mode){
    if (mode === undefined || mode == "") 
      return;
    // mode può essere: "km", "eur", "eur_km"

    // Raggruppo: macchina → mese → valori
    const grouped = {};  
    rows.forEach(r=>{
        const d = new Date(r.date);
        const monthKey = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");

        const machine = r.macchina || "Sconosciuta";
        if(!grouped[machine]) grouped[machine] = {};
        if(!grouped[machine][monthKey]) grouped[machine][monthKey] = [];

        grouped[machine][monthKey].push(r);
    });

    // Trovo tutti i mesi presenti
    const allMonths = new Set();
    Object.values(grouped).forEach(mac=>{
        Object.keys(mac).forEach(m=>allMonths.add(m));
    });

    const labels = Array.from(allMonths).sort();

    // Costruisco datasets (una linea per macchina)
    const datasets = [];

    Object.keys(grouped).forEach(machine=>{
        const monthlyValues = labels.map(month=>{
            const items = grouped[machine][month] || [];

            if(items.length === 0) return null;

            if(mode === "km"){
                return items.reduce((a,b)=>a + (parseFloat(b.km)||0),0) / items.length;
            }
            if(mode === "eur"){
                return items.reduce((a,b)=>a + (parseFloat(b.eur)||0),0) / items.length;
            }
            if(mode === "eur_km"){
                return items.reduce((a,b)=> a + ((b.eur && b.km) ? b.eur/b.km : 0),0) / items.length;
            }
        });

        datasets.push({
            label: machine,
            data: monthlyValues,
            borderWidth: 2,
            tension: 0.25,
            fill: false
        });
    });

    // Mostra grafico
    $('#chart-annual').show();
    const ctx = document.getElementById('chart-annual').getContext('2d');
    if(window._sk_chart) window._sk_chart.destroy();

    window._sk_chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { display: true }
            }
        }
    });
    delay(3000);
  }
  // Source - https://stackoverflow.com/a
  // Posted by Etienne Martin, modified by community. See post 'Timeline' for change history
  // Retrieved 2025-11-25, License - CC BY-SA 4.0

  const delay = ms => new Promise(res => setTimeout(res, ms));
  function applyFilters(allRows){
      const m = $('#filter-machine').val();
      const d = $('#filter-driver').val();

      let filtered = allRows.filter(r=>{
          const okMachine = (m === "All" || r.macchina === m);
          const okDriver = (d === "All" || r.autista === d);
          return okMachine && okDriver;
      });

      populateTable(filtered);
      renderChart(filtered, currentMode);
  }


  let currentMode = ""; // default

  $('.chart-btn').on('click', function(){
      currentMode = $(this).data('mode');
      applyFilters(rows);
  });

  $('#refresh').on('click', fetchData);

  // initial load
  fetchData();
});
