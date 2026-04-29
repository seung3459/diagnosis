// =====================================
// 🃏 호기 카드 렌더링 및 관리
// =====================================

// 페이지 전환 (topbar 제어 포함)
function showPage(id){ 
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); 
  document.getElementById(id).classList.add('active'); 
  
  const topbar = document.getElementById('topbar');
  if(topbar){
    if(id === 'intro' || id === 'projects'){
      topbar.style.display = 'none';
    } else {
      topbar.style.display = 'flex';
    }
  }
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

  // ⭐ coldSource subtype 판별 (터보 / 흡수식)
  const csSubtype = (type === 'coldSource')
    ? (unitSubtype[`${type}_${id}`] || (subtypeMap[type] && subtypeMap[type][0].key) || 'turbo')
    : null;
  const isAbsorption = csSubtype === 'absorption';

  // 일반 측정값 (coldSource 아닐 때 사용)
  let measureFields = '';
  if(fieldConfig[type]){
    fieldConfig[type].forEach((lbl,i)=>{
      measureFields += `<div class="field"><label>${lbl}</label><div class="input-wrap"><input type="text" id="${type}_${id}_f${i+1}"></div></div>`;
    });
  }

  // 진단 섹션
  let diagSection = '';
  if(diagApplyTypes.includes(type)){
    let diagRows = '';
    turboDiagItems.forEach((item, idx)=>{
      const base = `${type}_${id}_diag_${item.key}`;
      diagRows += `
        <tr>
          <td class="factor"><div class="factor-inner"><div class="factor-num">${idx+1}</div><div class="factor-name">${item.factor}</div></div></td>
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
        <thead><tr><th style="width:170px;">인자</th><th style="width:85px;">평가</th><th>주요 내용</th><th style="width:70px;">진단 기준</th><th style="width:110px;">조사대상</th><th style="width:160px;">비고</th></tr></thead>
        <tbody>${diagRows}</tbody>
      </table></div>
      <div class="section-title">📝 주요 검토 의견</div>
      <textarea class="opinion-box" id="${type}_${id}_opinion" placeholder="종합 검토 의견을 입력하세요..."></textarea>
      ${renderPhotoSection(type, id)}
    `;
  } else {
    diagSection = renderPhotoSection(type, id);
  }

  // ⭐ 명판사항 (subtype별 분기)
  let nameplateSection = '';
  if(type === 'coldSource'){
    if(isAbsorption){
      // 🔥 흡수식 냉동기 명판
      nameplateSection = `
        <div class="section-title">📋 명판사항</div>
        <div class="cs-sub-card">
          <div class="grid grid-2">
            <div class="field"><label>제조사</label><div class="input-wrap"><input type="text" id="${type}_${id}_np_maker" placeholder="예: LG"></div></div>
            <div class="field"><label>설치일자</label><div class="input-wrap"><input type="month" id="${type}_${id}_np_date"></div></div>
            <div class="field"><label>냉수 유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_flow" placeholder="0"><span class="unit">LPM</span></div></div>
            <div class="field"><label>냉방능력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_cooling" placeholder="0"><span class="unit">RT</span></div></div>
            <div class="field"><label>냉각수 유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_cwflow" placeholder="0"><span class="unit">LPM</span></div></div>
            <div class="field"><label>정격 동력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_power" placeholder="0"><span class="unit">kW</span></div></div>
            <div class="field"><label>연료 종류</label><div class="input-wrap"><input type="text" id="${type}_${id}_np_fueltype" placeholder="예: LNG"></div></div>
            <div class="field"><label>연료 발열량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_fuelheat" placeholder="0"><span class="unit">kcal/N㎥</span></div></div>
          </div>
        </div>
      `;
    } else {
      // ❄️ 터보냉동기 명판
      nameplateSection = `
        <div class="section-title">📋 명판사항</div>
        <div class="cs-sub-card">
          <div class="grid grid-2">
            <div class="field"><label>제조사</label><div class="input-wrap"><input type="text" id="${type}_${id}_np_maker" placeholder="예: 캐리어"></div></div>
            <div class="field"><label>설치일자</label><div class="input-wrap"><input type="month" id="${type}_${id}_np_date"></div></div>
            <div class="field"><label>냉수 유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_flow" placeholder="0"><span class="unit">LPM</span></div></div>
            <div class="field"><label>냉방능력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_cooling" placeholder="0"><span class="unit">RT</span></div></div>
            <div class="field"><label>냉각수 유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_cwflow" placeholder="0"><span class="unit">LPM</span></div></div>
            <div class="field"><label>정격 동력</label><div class="input-wrap"><input type="number" id="${type}_${id}_np_power" placeholder="0"><span class="unit">kW</span></div></div>
          </div>
        </div>
      `;
    }
  }

  // ⭐ 운전상태 부가옵션 (인버터 / 온열원 / AHU팬)
  let inverterCheckbox = '';
  let heatSourceRadio = '';
  if(type === 'coldSource'){
    if(isAbsorption){
      heatSourceRadio = `
        <div class="status-segment heatsrc-segment" data-unit="${type}_${id}_hs">
          <label data-val="steam"><input type="radio" name="${type}_${id}_heatsrc" value="steam" onchange="onHeatSourceChange('${type}',${id})">♨️ 증기</label>
          <label data-val="hotwater"><input type="radio" name="${type}_${id}_heatsrc" value="hotwater" onchange="onHeatSourceChange('${type}',${id})">💦 중온수</label>
        </div>
      `;
    } else {
      inverterCheckbox = `<label><input type="checkbox" id="${type}_${id}_inverter" onchange="toggleInverter('${type}',${id});updateSummary('${type}',${id});"> 인버터 여부</label>`;
    }
  }

  let ahuExtraCheck = '';
  if(type === 'ahu'){
    ahuExtraCheck = `<label><input type="checkbox" id="${type}_${id}_supplyFan"> 급기팬</label><label><input type="checkbox" id="${type}_${id}_exhaustFan"> 배기팬</label>`;
  }

  const extraRowContent = `${inverterCheckbox}${heatSourceRadio}${ahuExtraCheck}`;

  // 운전 상태 블록
  const stateBlock = `
    <div class="state-field">
      <label class="state-label">📊 운전 상태</label>
      <div class="state-controls">
        <div class="status-segment" data-unit="${type}_${id}">
          <label data-val="use"><input type="radio" name="${type}_${id}_status" value="use" onchange="onStatusChange('${type}',${id})">🟢 사용</label>
          <label data-val="fail"><input type="radio" name="${type}_${id}_status" value="fail" onchange="onStatusChange('${type}',${id})">🔴 고장</label>
          <label data-val="unused"><input type="radio" name="${type}_${id}_status" value="unused" onchange="onStatusChange('${type}',${id})">⚪ 미사용</label>
        </div>
        ${extraRowContent ? `<div class="extra-check-row">${extraRowContent}</div>` : ''}
      </div>
    </div>
  `;

  // 상단 카드: subtype 있으면 2열, 없으면 1열
  let topCard = '';
  if(hasSubtype(type)){
    const options = subtypeMap[type].map(s=>`<option value="${s.key}">${s.icon} ${s.label}</option>`).join('');
    topCard = `
      <div class="type-select-card">
        <div class="select-state-grid">
          <div class="field">
            <label>🏷️ 설비 종류 선택</label>
            <div class="input-wrap">
              <select id="${type}_${id}_subtype" onchange="changeSubtype('${type}',${id})">${options}</select>
            </div>
          </div>
          ${stateBlock}
        </div>
      </div>
    `;
  } else {
    topCard = `<div class="type-select-card">${stateBlock}</div>`;
  }

  // ⭐ 측정값 (subtype별 분기)
  let measureBlock;
  if(type === 'coldSource' && isAbsorption){
    // 🔥 흡수식: 냉수 / 냉각수 / 가열원
    measureBlock = `
      <div class="section-title">📊 운전 측정값</div>
      <div class="cs-sub-card">
        <div class="meas-3col">
          <div class="meas-col">
            <div class="meas-col-title">💧 냉수</div>
            <div class="field"><label>입구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f1" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>출구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f2" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f3" placeholder="0"><span class="unit">LPM</span></div></div>
          </div>
          <div class="meas-col">
            <div class="meas-col-title">❄️ 냉각수</div>
            <div class="field"><label>입구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f5" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>출구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f6" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f7" placeholder="0"><span class="unit">LPM</span></div></div>
          </div>
          <div class="meas-col heatsrc-meas-col">
            <div class="meas-col-title">🔥 가열원</div>
            <div class="heatsrc-empty" id="${type}_${id}_heatsrc_empty">운전상태에서<br>온열원을 선택하세요</div>
            <div class="heatsrc-fields-steam" id="${type}_${id}_heatsrc_steam" style="display:none;">
              <div class="field"><label>연료 발열량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f10" placeholder="0"><span class="unit">kcal/N㎥</span></div></div>
              <div class="field"><label>가스 사용량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f11" placeholder="0"><span class="unit">N㎥/h</span></div></div>
            </div>
            <div class="heatsrc-fields-hotwater" id="${type}_${id}_heatsrc_hot" style="display:none;">
              <div class="field"><label>입구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f12" placeholder="0"><span class="unit">℃</span></div></div>
              <div class="field"><label>출구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f13" placeholder="0"><span class="unit">℃</span></div></div>
              <div class="field"><label>유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f14" placeholder="0"><span class="unit">LPM</span></div></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if(type === 'coldSource'){
    // ❄️ 터보냉동기 (기존)
    measureBlock = `
      <div class="section-title">📊 운전 측정값</div>
      <div class="cs-sub-card">
        <div class="meas-3col">
          <div class="meas-col">
            <div class="meas-col-title">💧 냉수</div>
            <div class="field"><label>입구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f1" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>출구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f2" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f3" placeholder="0"><span class="unit">LPM</span></div></div>
          </div>
          <div class="meas-col">
            <div class="meas-col-title">❄️ 냉각수</div>
            <div class="field"><label>입구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f5" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>출구온도</label><div class="input-wrap"><input type="number" id="${type}_${id}_f6" placeholder="0"><span class="unit">℃</span></div></div>
            <div class="field"><label>유량</label><div class="input-wrap"><input type="number" id="${type}_${id}_f7" placeholder="0"><span class="unit">LPM</span></div></div>
          </div>
          <div class="meas-col">
            <div class="meas-col-title">⚡ 전기</div>
            <div class="field"><label>동력</label><div class="input-wrap"><input type="number" id="${type}_${id}_f8" placeholder="0"><span class="unit">kW</span></div></div>
            <div class="field"><label>전류</label><div class="input-wrap"><input type="number" id="${type}_${id}_f4" placeholder="0"><span class="unit">A</span></div></div>
            <div class="field"><label>주파수</label><div class="input-wrap"><input type="number" id="${type}_${id}_f9" placeholder="0"><span class="unit">Hz</span></div></div>
          </div>
        </div>
      </div>
    `;
  } else {
    measureBlock = `
      <div class="section-title">📊 운전 측정값</div>
      <div class="cs-sub-card">
        <div class="grid grid-2">${measureFields}</div>
      </div>
    `;
  }

  // 본문 배치: coldSource는 좌(명판) 2 : 우(측정값) 3
  const bodyMain = (type === 'coldSource')
    ? `
      <div class="np-meas-grid">
        <div class="np-meas-col np-col">${nameplateSection}</div>
        <div class="np-meas-col meas-col-wrap">${measureBlock}</div>
      </div>
    `
    : `${nameplateSection}${measureBlock}`;

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
        <div class="card-body">
          ${topCard}
          ${bodyMain}
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

// ⭐ subtype 변경 - coldSource는 구조가 달라지므로 재렌더 (입력값 보존)
function changeSubtype(type, id){
  const sel = document.getElementById(`${type}_${id}_subtype`);
  if(!sel) return;
  const newSubtype = sel.value;
  const oldSubtype = unitSubtype[`${type}_${id}`];

  if(type === 'coldSource' && oldSubtype !== newSubtype){
    const card = document.getElementById(`${type}_${id}_card`);
    if(!card){
      unitSubtype[`${type}_${id}`] = newSubtype;
      return;
    }

    // 입력값 백업
    const backup = { values:{}, checks:{}, radios:{} };
    card.querySelectorAll('input, textarea').forEach(el=>{
      if(el.type === 'radio'){
        if(el.checked) backup.radios[el.name] = el.value;
      } else if(el.type === 'checkbox'){
        if(el.id) backup.checks[el.id] = el.checked;
      } else if(el.id){
        backup.values[el.id] = el.value;
      }
    });

    const wasExpanded = card.classList.contains('expanded');
    unitSubtype[`${type}_${id}`] = newSubtype;

    // 재렌더
    card.outerHTML = renderCard(type, id);

    const newCard = document.getElementById(`${type}_${id}_card`);
    if(newCard){
      if(!wasExpanded) newCard.classList.remove('expanded');

      const newSel = document.getElementById(`${type}_${id}_subtype`);
      if(newSel) newSel.value = newSubtype;

      // 입력값 복원 (같은 ID/name이 있을 때만)
      Object.keys(backup.values).forEach(k=>{
        const el = document.getElementById(k);
        if(el) el.value = backup.values[k];
      });
      Object.keys(backup.checks).forEach(k=>{
        const el = document.getElementById(k);
        if(el) el.checked = backup.checks[k];
      });
      Object.keys(backup.radios).forEach(name=>{
        const radios = document.getElementsByName(name);
        radios.forEach(r=>{ if(r.value === backup.radios[name]) r.checked = true; });
        if(name === `${type}_${id}_status`) onStatusChange(type, id);
        if(name.includes('_diag_')){
          const checked = document.querySelector(`input[name="${name}"]:checked`);
          if(checked) updateRatingStyle(checked);
        }
      });

      // 흡수식 온열원 라벨/필드 동기화
      onHeatSourceChange(type, id);
    }
  } else {
    unitSubtype[`${type}_${id}`] = newSubtype;
  }

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
  if(status === 'use')         chips.push(`<span class="status-chip chip-use">🟢 사용중</span>`);
  else if(status === 'fail')   chips.push(`<span class="status-chip chip-fail">🔴 고장</span>`);
  else if(status === 'unused') chips.push(`<span class="status-chip chip-unused">⚪ 미사용</span>`);

  if(diagApplyTypes.includes(type)){
    const diagData = collectDiagFromForm(type, id);
    const result = calculateGrade(diagData);
    if(result.score !== null){
      chips.push(`<span class="status-chip chip-grade">종합 ${result.grade} (${result.score}점)</span>`);
    }
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
  // 인버터 주파수 입력 필드 제거됨 - 체크 상태만 저장
}

// 🆕 흡수식 - 온열원 선택에 따라 입력 필드 토글
function onHeatSourceChange(type, id){
  const checked = document.querySelector(`input[name="${type}_${id}_heatsrc"]:checked`);

  // segment active 효과
  const segment = document.querySelector(`.heatsrc-segment[data-unit="${type}_${id}_hs"]`);
  if(segment){
    segment.querySelectorAll('label').forEach(l=>l.classList.remove('active'));
    if(checked){
      const lab = checked.closest('label');
      if(lab) lab.classList.add('active');
    }
  }

  // 필드 표시 토글 (display:contents로 wrapper를 layout에서 제외 → 좌측 컬럼과 동일 정렬)
  const emptyEl = document.getElementById(`${type}_${id}_heatsrc_empty`);
  const steamEl = document.getElementById(`${type}_${id}_heatsrc_steam`);
  const hotEl   = document.getElementById(`${type}_${id}_heatsrc_hot`);

  if(emptyEl) emptyEl.style.display = checked ? 'none' : 'block';
  if(steamEl) steamEl.style.display = (checked && checked.value === 'steam') ? 'contents' : 'none';
  if(hotEl)   hotEl.style.display   = (checked && checked.value === 'hotwater') ? 'contents' : 'none';

  updateSummary(type, id);
}

// =====================================
// 🆕 라디오 재클릭 시 선택 해제 (status-segment, heatsrc-segment 공통)
// =====================================
(function setupRadioToggle(){
  document.addEventListener('click', function(e){
    // ⭐ input 자체의 click은 무시 (label 클릭 시 자동 전파되는 중복 이벤트 방지)
    if(e.target.tagName === 'INPUT') return;

    const label = e.target.closest('label');
    if(!label) return;
    if(!label.closest('.status-segment, .heatsrc-segment')) return;

    const radio = label.querySelector('input[type="radio"]');
    if(!radio) return;

    // click 핸들러는 default action(checked 변경) 전에 실행됨
    // → 이 시점의 radio.checked는 클릭 직전 상태
    if(radio.checked){
      // 이미 체크된 라디오를 다시 클릭 → 해제
      e.preventDefault();
      radio.checked = false;
      radio.dispatchEvent(new Event('change', {bubbles:true}));
    }
  });
})();
