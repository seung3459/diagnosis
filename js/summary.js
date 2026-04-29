// =====================================
// 📊 진단 요약 테이블
// 🆕 타입별 진단 항목 지원 (turbo / ahu)
// =====================================

function renderGroupSummary(type){
  const wrap = document.getElementById(`${type}SummaryWrap`);
  if(!wrap) return;
  const cards = Array.from(document.querySelectorAll(`#${type}Units .card`));
  if(cards.length===0){ 
    wrap.innerHTML = `<div class="no-data">📋 ${labelKor(type)}을(를) 추가하면 이곳에 진단 요약표가 자동으로 표시됩니다.</div>`; 
    return; 
  }
  
  const showDiag = diagApplyTypes.includes(type);
  const withSub = hasSubtype(type);
  const ordered = [];
  
  // 🆕 타입에 맞는 진단 항목 가져오기
  const diagItems = showDiag ? getDiagItems(type) : [];
  
  if(withSub){ 
    subtypeMap[type].forEach(st=>{ 
      cards.forEach(card=>{ 
        if(getUnitSubtype(type, card.dataset.id) === st.key) ordered.push({card, st}); 
      }); 
    }); 
  } else { 
    cards.forEach(card=>ordered.push({card, st:null})); 
  }
  
  let headers = '';
  if(withSub) headers += '<th style="width:160px;">종류</th>';
  headers += '<th style="width:70px;">호기</th><th style="width:90px;">상태</th>';
  if(showDiag){ 
    diagItems.forEach(item=>{ headers += `<th>${item.short}</th>`; });  // 🆕 diagItems 사용
    headers += '<th style="width:90px;">종합</th>'; 
  }
  
  let rows = '';
  let counter = {};
  let prevSubtype = null;
  
  ordered.forEach(({card, st})=>{
    const id = card.dataset.id;
    const st_chip = statusChip(getUnitStatus(type, id));
    let typeCell = ''; 
    let unitNum = 0; 
    let rowClass = '';
    
    if(withSub){
      const key = st.key;
      counter[key] = (counter[key]||0) + 1;
      unitNum = counter[key];
      typeCell = `<td class="type-col">${st.icon} ${st.label}</td>`;
      if(prevSubtype !== null && prevSubtype !== key) rowClass = 'group-start';
      prevSubtype = key;
    } else { 
      unitNum = ordered.findIndex(x=>x.card === card) + 1; 
    }
    
    let diagCells = '', gradeCell = '';
    if(showDiag){
      diagItems.forEach(item=>{  // 🆕 diagItems 사용
        const rateEl = document.querySelector(`input[name="${type}_${id}_diag_${item.key}_rate"]:checked`);
        if(rateEl){ 
          const v=rateEl.value; 
          diagCells += `<td class="rating-cell"><span class="rating-badge ${v}">${v}</span></td>`;
        }
        else diagCells += `<td class="rating-cell"><span class="rating-badge empty">-</span></td>`;
      });
      
      const diagData = collectDiagFromForm(type, id);
      const result = calculateGrade(diagData, type);  // 🆕 type 인자 추가
      const scoreText = result.score !== null ? `<span class="score-text">${result.score}점</span>` : '';
      gradeCell = `<td class="grade-cell ${result.gradeCls}">${result.grade}${scoreText}</td>`;
    }
    
    rows += `<tr class="${rowClass}">${typeCell}<td class="unit-col" onclick="scrollToCard('${type}_${id}_card')" title="클릭하면 해당 호기로 이동">${unitNum}호기</td><td>${st_chip}</td>${diagCells}${gradeCell}</tr>`;
  });
  
  // 진단 적용 타입에는 등급 산정 기준 모달 버튼 추가
  const helpBtn = showDiag ? `<button class="grade-info-btn" onclick="showGradeInfo()" title="종합 등급 산정 기준 보기">?</button>` : '';
  
  wrap.innerHTML = `<div class="summary-section-title">📊 ${labelKor(type)} 진단 요약${helpBtn}</div><div class="summary-table-wrap"><table class="summary-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div><div style="font-size:11px;color:#9ca3af;margin-top:6px;padding:0 4px;">💡 호기 번호를 클릭하면 해당 카드로 이동합니다.</div>`;
}
