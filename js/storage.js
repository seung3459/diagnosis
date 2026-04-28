// =====================================
// 💾 데이터 저장/복원 (GitHub 연동)
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

// =====================================
// 💾 수동 저장 (GitHub에 push)
// =====================================

async function manualSave(){
  if(!isAuthenticated){
    showToast('🔐 먼저 로그인해주세요');
    showTokenModal();
    return;
  }
  
  if(!canEdit){
    alert(`❌ 편집 권한이 없습니다.\n\n현재 ID: ${currentUser?.login}\n허용 ID: ${GITHUB_CONFIG.allowedUsers.join(', ')}`);
    return;
  }
  
  if(!currentProjectId){
    alert('⚠️ 활성 프로젝트가 없습니다.\n\n프로젝트 목록에서 프로젝트를 선택하거나 추가해주세요.');
    return;
  }
  
  showLoading('GitHub에 저장 중...\n(약 1~2초 소요)');
  
  try{
    const data = collectCurrentProjectData();
    await ghSaveProjectData(currentProjectId, data);
    hideLoading();
    
    const projName = currentProject?.name || '';
    showToast(`💾 GitHub 저장 완료: ${projName}`);
  } catch(e){
    hideLoading();
    console.error('저장 실패:', e);
    alert(`❌ 저장 실패\n\n${e.message}\n\n네트워크 또는 토큰을 확인해주세요.`);
  }
}

function saveData(){ manualSave(); }

// =====================================
// 종합 결과 보기
// =====================================

async function loadSummary(){
  if(!currentProjectId){
    document.getElementById('summaryBox').textContent = '⚠️ 활성 프로젝트가 없습니다.';
    return;
  }
  
  showLoading('데이터 로드 중...');
  
  try{
    const data = await ghLoadProjectData(currentProjectId);
    hideLoading();
    
    if(!data){
      document.getElementById('summaryBox').textContent = `📋 "${currentProject?.name || ''}" 프로젝트의 GitHub 데이터가 없습니다.\n\n💾 저장 버튼을 눌러 현재 작업을 저장하세요.`;
      return;
    }
    
    const preview = JSON.parse(JSON.stringify(data));
    if(preview.units){
      Object.keys(preview.units).forEach(type=>{
        preview.units[type].forEach(u=>{
          if(u.photos){ u.photos = u.photos.map(p=> p && p.img ? {img:'[사진 데이터 생략]', desc:p.desc} : p); }
        });
      });
    }
    
    const projInfo = `📋 프로젝트: ${currentProject?.name || '?'}\n` +
                     `🆔 ID: ${currentProjectId}\n` +
                     `🕐 마지막 수정: ${data.lastModified || '?'}\n` +
                     `👤 수정자: ${data.lastModifiedBy || '?'}\n` +
                     `${'='.repeat(60)}\n\n`;
    
    document.getElementById('summaryBox').textContent = projInfo + JSON.stringify(preview, null, 2);
  } catch(e){
    hideLoading();
    document.getElementById('summaryBox').textContent = `❌ 로드 실패: ${e.message}`;
  }
}
