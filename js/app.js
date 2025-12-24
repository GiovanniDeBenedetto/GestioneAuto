// Main app behaviour (uses jQuery)
$(function(){
  function loadConfigSync(){
     
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'js/config.json', false); // synchronous
    try{
      xhr.send(null);
      if(xhr.status === 200 || xhr.status === 0){
        return JSON.parse(xhr.responseText);
      }
    }catch(e){ console.error('Failed to load config.json', e); }
    return null;
  }

  var cfg = loadConfigSync();
  const API_URL = (cfg && cfg.apiEndpoint) ? cfg.apiEndpoint : "https://script.google.com/macros/s/AKfycbxkWY9YEU3Ip_JN_Ag1zIZ3-8HaXaktTsW0nOyZOt0I3h_XqXS2gSbGPeGa21CQebwR/exec";
  // Check login
  const username = localStorage.getItem('sk_username');
  const preferred = localStorage.getItem('sk_preferredMachine') || ((cfg && cfg.macchine && cfg.macchine[0])?cfg.macchine[0]:'Kia');
  const token = localStorage.getItem('sk_token') || ((cfg && cfg.sk_token)?cfg.sk_token:'Stellina');
  if(!username){
    // redirect to login if not present
    window.location.href = 'login.html';
    return;
  }

  $('#welcome-msg').text('Ciao ' + username);
  $('#autista').val(username);

  // populate macchina select from config if available
  if(cfg && cfg.macchine && Array.isArray(cfg.macchine)){
    var sel = $('#macchina');
    sel.empty();
    cfg.macchine.forEach(function(m){ sel.append('<option>'+m+'</option>'); });
    $('#macchina').val(preferred);
  } else {
    $('#macchina').val(preferred);
  }

  // date default today
  const toIsoDate = d => {
    const t = new Date(d);
    const off = t.getTimezoneOffset();
    t.setMinutes(t.getMinutes() - off);
    return t.toISOString().split('T')[0];
  };
  $('#date').val(toIsoDate(new Date()));

  $('#logout').on('click', function(e){
    e.preventDefault();
    localStorage.removeItem('sk_username');
    localStorage.removeItem('sk_preferredMachine');
    localStorage.removeItem('sk_token');
    window.location.href = 'login.html';
  });

  function doSendPayload(payload){
    $('#submit-btn').prop('disabled', true).text('Invio...');
    $.ajax({
      url: API_URL,
      method: 'POST',
      contentType: 'text/plain;charset=utf-8',
      data: JSON.stringify(payload),
      success: function(res){
        console.log('POST OK:', res);
        $('#form-result').text('Record salvato con successo.');
        $('#submit-btn').prop('disabled', false).text('Salva');
        // clear some fields
        $('#km,#eur,#litri,#note,#file-attach').val('');
      },
      error: function(xhr, status, err){
        console.error('POST ERR:', err);
        $('#form-result').text('Errore durante il salvataggio. Controlla la console.');
        $('#submit-btn').prop('disabled', false).text('Salva');
      }
    });
  }
  $('#record-form').on('submit', function(e){
    e.preventDefault();

    // validation: allow submit only if note has content OR all required fields are present
    var noteVal = ($('#note').val() || '').trim();
    var kmVal = ($('#km').val() || '').trim();
    var eurVal = ($('#eur').val() || '').trim();
    var litriVal = ($('#litri').val() || '').trim();
    var autistaVal = ($('#autista').val() || '').trim();
    var macchinaVal = ($('#macchina').val() || '').trim();

    function isNumeric(v){ return v !== '' && !isNaN(parseFloat(v)); }

    var hasNote = noteVal.length > 0;
    var hasAllFields = isNumeric(kmVal) && isNumeric(eurVal) && isNumeric(litriVal)
                       && autistaVal.length > 0 && macchinaVal.length > 0;

    if(!hasNote && !hasAllFields){
      $('#form-result').text('Inserisci una nota oppure compila contemporaneamente km, eur, litri. Ricarica la pagina se situazione strana.');
      return;
    }
    // interpret #litri: if < 4 it's eur_per_l, otherwise it's litres.
    const rawLitri = parseFloat($('#litri').val());
    const eur = parseFloat($('#eur').val() || 0);
    let litri = 0;
    let eur_per_l = 0;

    if (!isNaN(rawLitri) && rawLitri > 0 && rawLitri < 4) {
      // input is price per litre
      eur_per_l = rawLitri;
      litri = eur_per_l > 0 ? eur / eur_per_l : 0;
    } else {
      // input is litres
      litri = (!isNaN(rawLitri) && rawLitri > 0) ? rawLitri : 0;
      eur_per_l = litri > 0 ? eur / litri : 0;
    }

    // round sensible precision
    litri = Math.round(litri * 1000) / 1000;
    eur_per_l = Math.round(eur_per_l * 1000) / 1000;

    // benzina checkbox handling: if present use checked state, otherwise attempt to read select value
    var benzinaVal = '';
    if($('#benzinaChk').length){
      benzinaVal = $('#benzinaChk').is(':checked') ? 'ok' : '';
    } else if($('#benzina').length){
      benzinaVal = $('#benzina').val();
    }
    var database = '';
    if (hasNote) {
      database = 'Manutenzione';
    } else {
      database = 'database';
    }

    const payload = {
      token: token,
      database: database,
      macchina: $('#macchina').val(),
      autista: $('#autista').val(),
      date: $('#date').val(),
      km: parseFloat($('#km').val() || 0),
      eur: eur,
      litri: litri,
      eur_per_l: eur_per_l,
      benzina: benzinaVal,
      note: $('#note').val()
    };

    // handle optional file attachment: if file selected, read as dataURL and attach file and fileName
    var fileInput = document.getElementById('file-attach');
    if(fileInput && fileInput.files && fileInput.files.length > 0){
      var file = fileInput.files[0];
      var reader = new FileReader();
      reader.onload = function(evt){
        // evt.target.result is a data URL: data:<mime>;base64,ENCODED
        payload.file = evt.target.result;
        payload.fileName = file.name;
        doSendPayload(payload);
      };
      reader.onerror = function(err){
        console.error('File read error', err);
        // still send payload without file
        doSendPayload(payload);
      };
      reader.readAsDataURL(file);
    } else {
      // no file, send immediately
      doSendPayload(payload);
    }
  });

  document.getElementById("toggler").addEventListener("click",function(){
    var toggle = document.getElementById("toggle");
    var stile = toggle.style.display;
    console.log(stile);
    if(stile == "none"){
      toggle.style.display = "block";
    }else{
      toggle.style.display = "none";

    }

  });




});
