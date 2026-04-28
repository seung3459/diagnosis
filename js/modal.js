// =====================================
// 🪟 모달, 토스트, 로딩
// =====================================

// 진단 기준 모달
function showCriteria(key){
  const item = turboDiagItems.find(d=>d.key===key);
  if(!item) return;
  document.getElementById('modalTitle').textContent = `${item.factor} - 진단 기준`;
  document.getElementById('modalBody').innerHTML = `<div class="criteria-item"><div class="criteria-badge A">A</div><div class="criteria-text">${item.A}</div></div><div class="criteria-item"><div class="criteria-badge B">B</div><div class="criteria-text">${item.B}</div></div><div class="criteria-item"><div class="criteria-badge C">C</div><div class="criteria-text">${item.C}</div></div><div style="margin-top:14px;padding:10px;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280;">📂 <strong>조사대상:</strong> ${item.target} <br>⚖️ <strong>가중치:</strong> ${Math.round(item.weight*100)}%</div>`;
  document.getElementById('criteriaModal').classList.add('active');
}

function closeCriteriaModal(e){ 
  if(e && e.target.id !== 'criteriaModal' && e.type==='click') return; 
  document.getElementById('criteriaModal').classList.remove('active'); 
}

// 종합 등급 산정 기준 모달
function showGradeInfo(){
  let weightRows = '';
  turboDiagItems.forEach(item => {
    weightRows += `<tr><td>${item.factor}</td><td class="weight-val">${Math.round(item.weight*100)}%</td></tr>`;
  });
  
  const html = `
    <div class="grade-info-section">
      <div class="grade-info-section-title">📌 평가 결과 점수</div>
      <div class="score-grid">
        <div class="score-item A"><div class="grade-name">A</div><div class="grade-score">1.0점</div></div>
        <div class="score-item B"><div class="grade-name">B</div><div class="grade-score">0.6점</div></div>
        <div class="score-item C"><div class="grade-name">C</div><div class="grade-score">0.2점</div></div>
      </div>
    </div>
    
    <div class="grade-info-section">
      <div class="grade-info-section-title">⚖️ 인자별 가중치</div>
      <table class="weight-table">
        <thead><tr><th>인자</th><th style="text-align:right;">가중치</th></tr></thead>
        <tbody>${weightRows}<tr style="background:#eff6ff;font-weight:700;"><td>합계</td><td class="weight-val">100%</td></tr></tbody>
      </table>
    </div>
    
    <div class="grade-info-section">
      <div class="grade-info-section-title">🧮 점수 계산 공식</div>
      <div class="grade-formula">총점 = Σ (가중치 × 평가결과) × 100</div>
      <div style="font-size:11px;color:#6b7280;text-align:center;line-height:1.5;">예: 모두 A(1.0) → 100점 / 모두 B(0.6) → 60점 / 모두 C(0.2) → 20점</div>
    </div>
    
    <div class="grade-info-section">
      <div class="grade-info-section-title">🎯 등급 산정 기준</div>
      <div class="grade-criteria-list">
        <div class="grade-criteria-item"><div class="gr-badge A">A</div><div class="gr-text">60점 초과 — 양호 (정상 운영 가능)</div></div>
        <div class="grade-criteria-item"><div class="gr-badge B">B</div><div class="gr-text">40점 초과 ~ 60점 이하 — 주의 (보수 검토 필요)</div></div>
        <div class="grade-criteria-item"><div class="gr-badge C">C</div><div class="gr-text">40점 이하 — 위험 (즉시 조치 필요)</div></div>
      </div>
    </div>
  `;
  
  document.getElementById('gradeInfoBody').innerHTML = html;
  document.getElementById('gradeInfoModal').classList.add('active');
}

function closeGradeInfoModal(e){ 
  if(e && e.target.id !== 'gradeInfoModal' && e.type==='click') return; 
  document.getElementById('gradeInfoModal').classList.remove('active'); 
}

// 삭제 확인 모달
let pendingDelete = null;

function removeUnit(type, id){
  pendingDelete = {type, id};
  const name = getDisplayName(type, id);
  document.getElementById('confirmTitle').textContent = `${name}를 삭제하시겠습니까?`;
  document.getElementById('confirmMsg').textContent = `입력하신 데이터가 모두 사라집니다.`;
  document.getElementById('confirmModal').classList.add('active');
  document.getElementById('confirmDeleteBtn').onclick = function(){
    if(!pendingDelete) return;
    const {type, id} = pendingDelete;
    const deletedName = name;
    const card = document.getElementById(`${type}_${id}_card`);
    if(card) card.remove();
    delete unitSubtype[`${type}_${id}`];
    delete unitPhotos[`${type}_${id}`];
    refreshCardLabels(type);
    updateCount(type);
    renderGroupSummary(type);
    saveData();
    closeConfirmModal();
    showToast(`✅ ${deletedName} 삭제 완료`);
    pendingDelete = null;
  };
}

function closeConfirmModal(e){ 
  if(e && e.target.id !== 'confirmModal' && e.type==='click') return; 
  document.getElementById('confirmModal').classList.remove('active'); 
  pendingDelete = null; 
}

// 토스트 알림
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>{ toast.classList.remove('show'); }, 2500);
}

// 로딩 오버레이
function showLoading(text){
  document.getElementById('loadingText').textContent = text || '처리 중...';
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading(){
  document.getElementById('loadingOverlay').classList.remove('active');
}

// ESC로 모달 닫기
document.addEventListener('keydown', e=>{ 
  if(e.key==='Escape'){ 
    closeCriteriaModal(); 
    closeConfirmModal(); 
    closePhotoViewer(); 
    closeGradeInfoModal(); 
  } 
});
