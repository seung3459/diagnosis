// =====================================
// 💾 데이터 저장/복원
// =====================================

function collectUnitData(type, id){
  const data = {};
  if(hasSubtype(type)) data.subtype = getUnitSubtype(type, id);
  data.status = getUnitStatus(type, id);
  ['inverter','supplyFan','exhaustFan'].forEach(k=>{ 
    const el = document.getElementById(`${type}_${id}_${k}`); 
    if(el) data[k] = el.checked; 
  });
  fieldConfig[type].forEach((_,idx)=>{ 
    const el = document.getElementById(`${type}_${id}_f${idx+1}`); 
    if(el) data[`f${idx+1}`] = el.value; 
  });
  if(type === 'coldSource'){
    data.nameplate = {};
    ['maker','model','date','cooling','flow','power'].forEach(f=>{ 
      const el = document.getElementById(`${type}_${id}_np_${f}`); 
      if(el) data.nameplate[f] = el.value; 
    });
    const invEl = document.getElementById(`${type}_${id}_inverterValue`);
    if(invEl) data.inverterValue = invEl.value;
  }
  if(diagApplyTypes.includes(type)){
    data.diag = {};
    turboDiagItems.forEach(item=>{
      const baseKey = `${type}_${id}_diag_${item.key}`;
      const rateEl = document.querySelector(`input[name="${baseKey}_rate"]:checked`);
      const contentEl = document.getElementById(`${baseKey}_content`);
      const noteEl = document.getElementById(`${baseKey}_note`);
      data.diag[item.key] = { 
        rate: rateEl ? rateEl.value : null, 
        content: contentEl ? contentEl.value : '', 
        note: noteEl ? noteEl.value : '' 
      };
    });
    const opEl = document.getElementById(`${type}_${id}_opinion`);
    if(opEl) data.opinion = opEl.value;
  }
  data.photos = unitPhotos[`${type}_${id}`] || [];
  return data;
}

function applyUnitData(type, id, data){
  if(hasSubtype(type) && data.subtype){
    unitSubtype[`${type}_${id}`] = data.subtype;
    const sel = document.getElementById(`${type}_${id}_subtype`);
    if(sel) sel.value = data.subtype;
    refreshCardLabels(type);
  }
  let status = data.status;
  if(!status && (data.use !== undefined || data.fail !== undefined)){
    if(data.fail) status = 'fail'; else if(data.use) status = 'use'; else status = '';
  }
  if(status) setUnitStatus(type, id, status);
  ['inverter','supplyFan','exhaustFan'].forEach(k=>{ 
    const el = document.getElementById(`${type}_${id}_${k}`); 
    if(el && data[k] !== undefined) el.checked = data[k]; 
  });
  fieldConfig[type].forEach((_,idx)=>{ 
    const el = document.getElementById(`${type}_${id}_f${idx+1}`); 
    if(el && data[`f${idx+1}`] !== undefined) el.value = data[`f${idx+1}`]; 
  });
  if(type === 'coldSource'){
    if(data.nameplate){ 
      ['maker','model','date','cooling','flow','power'].forEach(f=>{ 
        const el = document.getElementById(`${type}_${id}_np_${f}`); 
        if(el && data.nameplate[f] !== undefined) el.value = data.nameplate[f]; 
      }); 
    }
    if(data.inverterValue !== undefined){ 
      const invEl = document.getElementById(`${type}_${id}_inverterValue`); 
      if(invEl) invEl.value = data.inverterValue; 
    }
    toggleInverter(type, id);
  }
  if(diagApplyTypes.includes(type) && data.diag){
    turboDiagItems.forEach(item=>{
      const d = data.diag[item.key];
      if(!d) return;
      const baseKey = `${type}_${id}_diag_${item.key}`;
      if(d.rate){ 
        const radios = document.getElementsByName(`${baseKey}_rate`); 
        radios.forEach(r=>{ if(r.value === d.rate){ r.checked = true; updateRatingStyle(r); } }); 
      }
      const contentEl = document.getElementById(`${baseKey}_content`);
      if(contentEl && d.content !== undefined) contentEl.value = d.content;
      const noteEl = document.getElementById(`${baseKey}_note`);
      if(noteEl && d.note !== undefined) noteEl.value = d.note;
    });
    if(data.opinion !== undefined){ 
      const opEl = document.getElementById(`${type}_${id}_opinion`); 
      if(opEl) opEl.value = data.opinion; 
    }
  }
  if(Array.isArray(data.photos) && data.photos.length > 0){
    const photos = new Array(PHOTO_COUNT).fill(null).map((_,i)=>{
      const p = data.photos[i];
      return p ? {img:p.img||null, desc:p.desc||''} : {img:null,desc:''};
    });
    unitPhotos[`${type}_${id}`] = photos;
    const grid = document.getElementById(`${type}_${id}_photoGrid`);
    if(grid){
      let html = '';
      for(let i=0; i<PHOTO_COUNT; i++) html += renderPhotoSlot(type, id, i);
      grid.innerHTML = html;
    }
  }
  updateSummary(type, id);
}

function manualSave(){ 
  try{ saveData(); alert('저장 완료'); }
  catch(e){
    console.error(e);
    if(e.name === 'QuotaExceededError') alert('❌ 저장 실패: 용량 초과\n\n사진이 너무 많거나 큽니다. 일부 사진을 삭제해주세요.');
    else alert('저장 중 오류가 발생했습니다.');
  }
}

function saveData(){
  const data = {
    projectName: document.getElementById('projectName')?.value || '',
    buildingName: document.getElementById('buildingName')?.value || '',
    projectStartDate: document.getElementById('projectStartDate')?.value || '',
    dateRange: document.getElementById('dateRange')?.value || '',
    units: {}
  };
  Object.keys(fieldConfig).forEach(type=>{
    data.units[type] = [];
    const container = document.getElementById(type+'Units');
    if(!container) return;
    container.querySelectorAll('.card').forEach(card=>{
      data.units[type].push(collectUnitData(type, card.dataset.id));
    });
  });
  localStorage.setItem('facilityReport', JSON.stringify(data));
}

function loadSummary(){
  const raw = localStorage.getItem('facilityReport');
  if(!raw){ document.getElementById('summaryBox').textContent = '저장된 데이터 없음'; return; }
  try{
    const data = JSON.parse(raw);
    const preview = JSON.parse(JSON.stringify(data));
    if(preview.units){
      Object.keys(preview.units).forEach(type=>{
        preview.units[type].forEach(u=>{
          if(u.photos){ u.photos = u.photos.map(p=> p && p.img ? {img:'[사진 데이터 생략]', desc:p.desc} : p); }
        });
      });
    }
    document.getElementById('summaryBox').textContent = JSON.stringify(preview, null, 2);
  } catch(e){ document.getElementById('summaryBox').textContent = raw; }
}
