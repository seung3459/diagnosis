// =====================================
// 🃏 호기 카드 렌더링 및 관리
// =====================================

// 페이지 전환 (topbar 제어 포함)
function showPage(id){ 
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); 
  document.getElementById(id).classList.add('active'); 
  
  // 인트로/프로젝트 목록 페이지에서는 topbar 숨김
  const topbar = document.getElementById('topbar');
  if(topbar){
    if(id === 'intro' || id === 'projects'){
      topbar.style.display = 'none';
    } else {
      topbar.style.display = 'flex';
    }
  }
  
  // 페이지 진입 시 스크롤 맨 위로
  window.scrollTo(0, 0);
}

function showSection(id, btn){
  ['heatSection','airSection','pumpSection','pipeSection'].forEach(s=>document.getElementById(s).style.display='none');
  document.getElementById(id).style.display='block';
  document.querySelectorAll('.main-tabs button').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

function showHeatType(id, btn){ ['coldSourceSection','heatSourceSection','coolingTowerSection'].forEach(s=>document.getElementById(s).style.display='none'); document.getElementById(id).style.display='block'; setActiveSubTab(btn); }
function showAirType(id, btn){ ['ahuSection','fanSection'].forEach(s=>document.getElementById(s).style.display='none'); document.getElementById(id).style.display='block'; setActiveSubTab(btn); }
function showPumpType(id, btn){ ['chilledPumpSection','hotPumpSection','coolingPumpSection'].forEach(s=>document.getElementById(s).style.display='none'); document.getElementById(id).style.display='block'; setActiveSubTab(btn); }
function setActiveSubTab(btn){ if(!btn) return; btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }

// 호기 추가
function addUnit(type){
  if(!unitCount[type]) unitCount[type]=0;
  unitCount[type]++;
  const id = unitCount[type];
  const container = document.getElementById(type+'Units');
  if(hasSubtype(type)) unitSubtype[`${type}_${id}`] = subtypeMap[type][0].key;
  unitPhotos[`${type}_${id}`] = new Array(PHOTO_COUNT).fill(null).map(()=>({img:null, desc:''}));
  container.insertAdjacentHTML('beforeend', renderCard(type, id));
  refreshCardLabels(type);
  updateCount(type);
  updateSummary(type, id);
  renderGroupSummary(type);
}

// 카드 HTML 생성
function renderCard(type, id){
  const displayName = getDisplayName(type, id);
  const icon = getDisplayIcon(type, id);

  let typeSelectHTML = '';
  if(hasSubtype(type)){
    const options = subtypeMap[type].map(s=>`<option value="${s.key}">${s.icon} ${s.label}</option>`).join('');
    typeSelectHTML = `<div class="type-select-card"><div class="field"><label>🏷️ 설비 종류 선택</label><div class="input-wrap"><select id="${type}_${id}_subtype" onchange="changeSubtype('${type}',${id})">${options}</select></div></div></div>`;
  }

  let measureFields = '';
  fieldConfig[type].forEach((lbl,i)=>{
    measureFields += `<div class="field"><label>${lbl}</label><div class="input-wrap"><input type="text" id="${type}_${id}_f${i+1}"></div></div>`;
  });

  let diagSection = '';
  if(diagApplyTypes.includes(type)){
    let diagRows = '';
    turboDiagItems.forEach((item, idx)=>{
      const base = `${type}_${id}_diag_${item.key}`;
      diagRows += `
        <tr>
          <td class="factor"><div class="factor-inner"><div class="factor-num">${idx+1}</div><div class="factor-name">${item.factor}<div class="factor-weight">가중치 ${Math.round(item.weight*100)}%</div></div></div></td>
          <td class="rating-cell">
            <div class="rating-group" data-base="${base}">
              <label><input type="radio" name="${base}_rate" value="A" onchange="updateRatingStyle(this);updateSummary('${type}',${id});renderGroupSummary('${type}');"><span class="rating-A">A</span></label>
              <label><input type="radio" name="${base}_rate" value="B" onchange="updateRatingStyle(this);updateSummary('${type}',${id});renderGroupSummary('${type}');"><span class="rating-B">B</span></label>
              <label><input type="radio" name="${base}_rate" value="C" onchange="updateRatingStyle(this);updateSummary('${type}',${id});renderGroupSummary('${type}');"><span class="rating-C">C</span></label>
            </div>
          </td>
          <td class="content-cell"><input type="text" id="${base}_content" placeholder="주요 내용 입력"></td>
          <td class="info-cell"><button class="info-btn" onclick="showCriteria('${item.key}')" title="진단 기준 보기">?</button></td>
          <td class="target">${item.target}</td>
          <td class="note-cell"><input type="text" id="${base}_note" placeholder="비고"></td>
        </tr>
      `;
    });
    diagSection = `
      <div class="section-title">🔍 1차 진단 Check-list (육안점검)</div>
      <div class="diag-table-wrap"><table class="diag-table">
        <thead><tr><th style="width:170px;">인자 (가중치)</th><th style="width:85px;">평가</th><th>주요 내용</th><th style="width:70px;">진단 기준</th><th style="width:110px;">조사대상</th><th style="width:160px;">비고</th></tr></thead>
        <tbody>${diagRows}</tbody>
      </table></div>
      <div class="section-title">📝 주요 검토 의견</div>
      <textarea class="opinion-box" id="${type}_${id}_opinion" placeholder="종합 검토 의견을 입력하세요..."></textarea>
      ${renderPhotoSection(type, id)}
    `;
  } else {
    diagSection = renderPhotoSection(type, id);
  }

  let nameplateSection = '';
  if(type === 'coldSource'){
    nameplateSection = `
      <div class="section-title">📋 명판사항</div>
      <div class="cs-sub-card">
        <div class="grid grid-3">
          <div class="field"><label>제조사</label><div class="input-wrap"><input type="text" id="${type}_${id}_np_maker" placeholder="예: 캐리어"></div></div>
          <div class="field"><label>모델명</label><div class="input-wrap"><input type="text" id="${type}_${id}_np_model" placeholder="예: 19XR"></div></div>
          <div class="field"><label>설치일자</label><div class="input-wrap"><input type="date" id="${type}_${id}_np_date"></div></div>
          <div class="field"><label>냉방능력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_cooling" placeholder="0"><span class="unit">RT</span></div></div>
          <div class="field"><label>정격 유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_flow" placeholder="0"><span class="unit">m³/h</span></div></div>
          <div class="field"><label>정격 동력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_power" placeholder="0"><span class="unit">kW</span></div></div>
        </div>
      </div>
    `;
  }

  let inverterCheckbox = '', inverterField = '';
  if(type === 'coldSource'){
    inverterCheckbox = `<label><input type="checkbox" id="${type}_${id}_inverter" onchange="toggleInverter('${type}',${id});updateSummary('${type}',${id});"> 인버터 여부</label>`;
    inverterField = `<div class="inverter-field" id="${type}_${id}_inverterWrap"><div class="field" style="margin-top:12px;"><label>⚙️ 인버터 주파수</label><div class="input-wrap"><input type="number" step="0.1" id="${type}_${id}_inverterValue" placeholder="0.0"><span class="unit">Hz</span></div></div></div>`;
  }

  let ahuExtraCheck = '';
  if(type === 'ahu'){
    ahuExtraCheck = `<label><input type="checkbox" id="${type}_${id}_supplyFan"> 급기팬</label><label><input type="checkbox" id="${type}_${id}_exhaustFan"> 배기팬</label>`;
  }

  const statusSegment = `
    <div class="status-segment" data-unit="${type}_${id}">
      <label data-val="use"><input type="radio" name="${type}_${id}_status" value="use" onchange="onStatusChange('${type}',${id})">🟢 사용</label>
      <label data-val="fail"><input type="radio" name="${type}_${id}_status" value="fail" onchange="onStatusChange('${type}',${id})">🔴 고장</label>
      <label data-val="unused"><input type="radio" name="${type}_${id}_status" value="unused" onchange="onStatusChange('${type}',${id})">⚪ 미사용</label>
    </div>
  `;

  return `
    <div class="card expanded" id="${type}_${id}_card" data-type="${type}" data-id="${id}">
      <div class="card-header" onclick="toggleCard('${type}_${id}_card', event)">
        <div class="header-icon">${icon}</div>
        <div class="header-title">
          <div>${displayName}</div>
          <div class="header-sub" id="${type}_${id}_summary"></div>
        </div>
        <span class="arrow">▼</span>
        <button class="delete-btn" onclick="event.stopPropagation();removeUnit('${type}',${id})">삭제</button>
      </div>
      <div class="card-content">
        <div class="equip-image">
          <img src="${imageMap[type]}">
          <div class="overlay">
            <div class="title">${displayName}</div>
            ${statusSegment}
            ${(inverterCheckbox || ahuExtraCheck) ? `<div class="extra-check-row">${inverterCheckbox}${ahuExtraCheck}</div>` : ''}
          </div>
        </div>
        <div class="card-body">
          ${typeSelectHTML}
          ${nameplateSection}
          <div class="section-title">📊 운전 측정값</div>
          <div class="cs-sub-card">
            <div class="grid grid-2">${measureFields}</div>
            ${inverterField}
          </div>
          ${diagSection}
        </div>
      </div>
    </div>
  `;
}

// 카드 라벨 갱신
function refreshCardLabels(type){
  const container = document.getElementById(type+'Units');
  if(!container) return;
  container.querySelectorAll('.card').forEach(card=>{
    const id = card.dataset.id;
    const displayName = getDisplayName(type, id);
    const headerName = card.querySelector('.header-title > div:first-child');
    if(headerName) headerName.textContent = displayName;
    const iconBox = card.querySelector('.header-icon');
    if(iconBox) iconBox.textContent = getDisplayIcon(type, id);
    const overlayTitle = card.querySelector('.overlay .title');
    if(overlayTitle) overlayTitle.textContent = displayName;
    const photoTitle = card.querySelector('.photo-section-title');
    if(photoTitle) photoTitle.textContent = `📸 현장 사진 (${displayName})`;
  });
}

function onStatusChange(type, id){
  const segment = document.querySelector(`.status-segment[data-unit="${type}_${id}"]`);
  if(segment){
    const labels = segment.querySelectorAll('label');
    labels.forEach(l=>l.classList.remove('active'));
    const checked = segment.querySelector('input:checked');
    if(checked){ const lab = checked.closest('label'); if(lab) lab.classList.add('active'); }
  }
  updateSummary(type, id);
  renderGroupSummary(type);
}

function getUnitStatus(type, id){ const checked = document.querySelector(`input[name="${type}_${id}_status"]:checked`); return checked ? checked.value : ''; }
function setUnitStatus(type, id, status){ const radios = document.getElementsByName(`${type}_${id}_status`); radios.forEach(r=>{ r.checked = (r.value === status); }); onStatusChange(type, id); }

function changeSubtype(type, id){
  const sel = document.getElementById(`${type}_${id}_subtype`);
  if(!sel) return;
  unitSubtype[`${type}_${id}`] = sel.value;
  refreshCardLabels(type);
  updateSummary(type, id);
  renderGroupSummary(type);
}

function toggleCard(cardId, e){
  if(e && e.target && (e.target.tagName==='INPUT' || e.target.tagName==='BUTTON' || e.target.tagName==='SELECT' || e.target.tagName==='LABEL' || e.target.closest('.delete-btn') || e.target.closest('.photo-slot'))) return;
  const card = document.getElementById(cardId);
  if(card) card.classList.toggle('expanded');
}

function toggleAll(type, expand){
  const container = document.getElementById(type+'Units');
  if(!container) return;
  container.querySelectorAll('.card').forEach(c=>{ if(expand) c.classList.add('expanded'); else c.classList.remove('expanded'); });
}

function scrollToCard(cardId){ 
  const card = document.getElementById(cardId); 
  if(!card) return; 
  card.classList.add('expanded'); 
  card.scrollIntoView({behavior:'smooth', block:'start'}); 
  card.classList.add('highlight'); 
  setTimeout(()=>{ card.classList.remove('highlight'); }, 1800); 
}

function updateCount(type){
  const el = document.getElementById(`${type}_count`);
  if(!el) return;
  const container = document.getElementById(type+'Units');
  const cnt = container ? container.querySelectorAll('.card').length : 0;
  el.textContent = `${cnt} 대`;
}

function updateSummary(type, id){
  const el = document.getElementById(`${type}_${id}_summary`);
  if(!el) return;
  const chips = [];
  const status = getUnitStatus(type, id);
  if(status === 'use') chips.push(`<span class="status-chip chip-use">🟢 사용중</span>`);
  else if(status === 'fail') chips.push(`<span class="status-chip chip-fail">🔴 고장</span>`);
  else if(status === 'unused') chips.push(`<span class="status-chip chip-unused">⚪ 미사용</span>`);
  const invEl = document.getElementById(`${type}_${id}_inverter`);
  if(invEl && invEl.checked) chips.push(`<span class="status-chip chip-inv">인버터</span>`);
  if(diagApplyTypes.includes(type)){
    let a=0,b=0,c=0;
    turboDiagItems.forEach(item=>{
      const rateEl = document.querySelector(`input[name="${type}_${id}_diag_${item.key}_rate"]:checked`);
      if(rateEl){ if(rateEl.value==='A') a++; else if(rateEl.value==='B') b++; else if(rateEl.value==='C') c++; }
    });
    if(a) chips.push(`<span class="status-chip chip-A">A ${a}</span>`);
    if(b) chips.push(`<span class="status-chip chip-B">B ${b}</span>`);
    if(c) chips.push(`<span class="status-chip chip-C">C ${c}</span>`);
    
    const diagData = collectDiagFromForm(type, id);
    const result = calculateGrade(diagData);
    if(result.score !== null){
      chips.push(`<span class="status-chip chip-grade">종합 ${result.grade} (${result.score}점)</span>`);
    }
  }
  const photos = unitPhotos[`${type}_${id}`];
  if(photos){
    const filled = photos.filter(p=>p && p.img).length;
    if(filled>0) chips.push(`<span class="status-chip" style="background:#06b6d4;color:#fff;">📸 ${filled}/${PHOTO_COUNT}</span>`);
  }
  el.innerHTML = chips.length ? chips.join('') : '<span style="color:#9ca3af;">상태 미입력</span>';
}

function updateRatingStyle(radio){
  const group = radio.closest('.rating-group');
  if(!group) return;
  group.querySelectorAll('label').forEach(l=>{ l.classList.remove('sel-A','sel-B','sel-C'); });
  const selectedLabel = radio.closest('label');
  if(selectedLabel) selectedLabel.classList.add('sel-'+radio.value);
}

function toggleInverter(type, id){
  const chk = document.getElementById(`${type}_${id}_inverter`);
  const wrap = document.getElementById(`${type}_${id}_inverterWrap`);
  if(chk && wrap) wrap.classList.toggle('active', chk.checked);
}
