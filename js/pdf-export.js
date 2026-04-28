// =====================================
// 📄 PDF 내보내기 (새 창 인쇄 방식)
// =====================================

function exportToPDF(){
  const collected = collectColdSourceData();
  if(!collected){
    alert('⚠️ 내보낼 냉열원 데이터가 없습니다.');
    return;
  }

  showLoading('PDF 미리보기 준비 중...');

  try{
    const { projectInfo, allUnits } = collected;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if(!printWindow){
      hideLoading();
      alert('❌ 팝업이 차단되었습니다.\n\n주소창 우측의 팝업 차단 아이콘을 클릭해 "허용"으로 변경 후 다시 시도해주세요.');
      return;
    }

    const safeName = (projectInfo.projectName || '냉동기진단').replace(/[\\/:*?"<>|]/g,'_');
    const today = new Date().toISOString().slice(0,10);

    let bodyHTML = '';

    // 표지 페이지
    bodyHTML += `<div class="page cover">`;
    bodyHTML += `<div class="cover-box">`;
    bodyHTML += `<div class="cover-title">📊 기계설비 노후화 진단 보고서</div>`;
    bodyHTML += `<div class="cover-sub">Mechanical Facility Aging Diagnosis Report</div>`;
    bodyHTML += `<table class="info-table">
      <tr><th>프로젝트명</th><td>${escapeHtml(projectInfo.projectName)||'-'}</td></tr>
      <tr><th>건물명</th><td>${escapeHtml(projectInfo.buildingName)||'-'}</td></tr>
      <tr><th>과업 시작일</th><td>${escapeHtml(projectInfo.projectStartDate)||'-'}</td></tr>
      <tr><th>점검 기간</th><td>${escapeHtml(projectInfo.dateRange)||'-'}</td></tr>
      <tr><th>생성일시</th><td>${new Date().toLocaleString('ko-KR')}</td></tr>
    </table>`;

    bodyHTML += `<div class="section-h">📊 냉열원 진단 종합 요약</div>`;
    bodyHTML += `<table class="data-table"><thead><tr>`;
    bodyHTML += `<th>종류</th><th>호기</th><th>상태</th>`;
    turboDiagItems.forEach(it => bodyHTML += `<th>${it.short}<br><small>(${Math.round(it.weight*100)}%)</small></th>`);
    bodyHTML += `<th>점수</th><th>종합</th></tr></thead><tbody>`;
    allUnits.forEach(u => {
      bodyHTML += `<tr>`;
      bodyHTML += `<td class="left">${escapeHtml(u.subtypeLabel)}</td>`;
      bodyHTML += `<td>${u.unitNum}호기</td>`;
      bodyHTML += `<td>${escapeHtml(u.statusText)}</td>`;
      u.diagRates.forEach(r => {
        const cls = r==='A'?'rate-A':r==='B'?'rate-B':r==='C'?'rate-C':'';
        bodyHTML += `<td class="${cls}">${r}</td>`;
      });
      bodyHTML += `<td><strong>${u.score !== null ? u.score : '-'}</strong></td>`;
      const gcls = u.grade==='A'?'rate-A':u.grade==='B'?'rate-B':u.grade==='C'?'rate-C':'';
      bodyHTML += `<td class="${gcls}"><strong>${u.grade}</strong></td>`;
      bodyHTML += `</tr>`;
    });
    bodyHTML += `</tbody></table>`;
    
    bodyHTML += `<div class="grade-criteria-info">
      <div class="grade-criteria-title">📌 종합 등급 산정 기준</div>
      <div>• 평가점수: <strong>A=1.0, B=0.6, C=0.2</strong></div>
      <div>• 점수 = Σ(가중치 × 평가결과) × 100</div>
      <div>• 등급: <span class="rate-A" style="padding:2px 6px;">60점 초과 A</span> / <span class="rate-B" style="padding:2px 6px;">40~60점 B</span> / <span class="rate-C" style="padding:2px 6px;">40점 이하 C</span></div>
    </div>`;
    bodyHTML += `</div></div>`;

    // 호기별 페이지
    allUnits.forEach(u => {
      // 페이지 A: 검토 결과
      bodyHTML += `<div class="page">`;
      bodyHTML += `<div class="unit-title">${escapeHtml(u.subtypeLabel)} - ${u.unitNum}호기 <span class="page-tag">[검토 결과]</span></div>`;
      const scoreInfo = u.score !== null ? ` (${u.score}점)` : '';
      bodyHTML += `<div class="unit-sub">상태: ${escapeHtml(u.statusText)} | 종합 등급: <strong class="grade-${u.grade}">${u.grade}${scoreInfo}</strong></div>`;

      bodyHTML += `<div class="section-h">🔍 1차 진단 Check-list</div>`;
      bodyHTML += `<table class="data-table"><thead><tr>`;
      bodyHTML += `<th style="width:40px;">번호</th><th style="width:160px;">인자 (가중치)</th><th style="width:55px;">평가</th><th>주요 내용</th><th style="width:100px;">조사 대상</th></tr></thead><tbody>`;
      turboDiagItems.forEach((it, idx)=>{
        const d = u.diag[it.key] || {};
        const r = d.rate || '-';
        const cls = r==='A'?'rate-A':r==='B'?'rate-B':r==='C'?'rate-C':'';
        bodyHTML += `<tr>`;
        bodyHTML += `<td>${idx+1}</td>`;
        bodyHTML += `<td class="left"><strong>${escapeHtml(it.factor)}</strong> <span style="color:#6b7280;font-size:10px;">(${Math.round(it.weight*100)}%)</span></td>`;
        bodyHTML += `<td class="${cls}"><strong>${r}</strong></td>`;
        bodyHTML += `<td class="left">${escapeHtml(d.content||'')}</td>`;
        bodyHTML += `<td>${escapeHtml(it.target)}</td>`;
        bodyHTML += `</tr>`;
      });
      bodyHTML += `</tbody></table>`;

      bodyHTML += `<div class="section-h">📝 주요 검토 의견</div>`;
      bodyHTML += `<div class="opinion-box-large">${escapeHtml(u.opinion)||'(미입력)'}</div>`;
      bodyHTML += `</div>`;

      // 페이지 B: 현장 사진
      const validPhotos = (u.photos||[]).map((p,i)=>({...p, idx:i})).filter(p=>p.img);
      if(validPhotos.length > 0){
        bodyHTML += `<div class="page">`;
        bodyHTML += `<div class="unit-title">${escapeHtml(u.subtypeLabel)} - ${u.unitNum}호기 <span class="page-tag">[현장 사진]</span></div>`;
        bodyHTML += `<div class="unit-sub">총 ${validPhotos.length}장의 현장 사진</div>`;
        bodyHTML += `<div class="section-h">📸 현장 사진</div>`;
        bodyHTML += `<div class="photo-grid">`;
        validPhotos.forEach(p=>{
          bodyHTML += `<div class="photo-card">`;
          bodyHTML += `<div class="photo-desc">📷 사진${p.idx+1}: ${escapeHtml(p.desc)||'-'}</div>`;
          bodyHTML += `<img class="photo-img" src="${p.img}" alt="사진${p.idx+1}">`;
          bodyHTML += `</div>`;
        });
        bodyHTML += `</div>`;
        bodyHTML += `</div>`;
      }
    });

    const fullHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${safeName}_${today}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1f2937; background: #e5e7eb; }
  .toolbar { position: sticky; top: 0; background: #1f2937; padding: 12px; text-align: center; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  .toolbar button { background: #dc2626; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; margin: 0 5px; }
  .toolbar button.cancel { background: #6b7280; }
  .toolbar .info { color: #d1d5db; font-size: 12px; margin-top: 8px; }
  .page { background: #fff; max-width: 794px; margin: 20px auto; padding: 30px 35px; box-shadow: 0 4px 20px rgba(0,0,0,.1); page-break-after: always; min-height: 1050px; }
  .page:last-child { page-break-after: auto; }
  .cover-box { width: 100%; }
  .cover-title { font-size: 26px; font-weight: 800; color: #1f2937; margin-bottom: 6px; }
  .cover-sub { font-size: 14px; color: #6b7280; margin-bottom: 30px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .info-table th, .info-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
  .info-table tr:last-child th, .info-table tr:last-child td { border-bottom: none; }
  .info-table th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; width: 130px; }
  .info-table td { color: #111827; }
  .unit-title { font-size: 22px; font-weight: 800; color: #1f2937; margin-bottom: 4px; padding-bottom: 8px; border-bottom: 3px solid #2563eb; }
  .unit-sub { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
  .page-tag { font-size: 14px; font-weight: 600; color: #2563eb; background: #dbeafe; padding: 4px 10px; border-radius: 6px; margin-left: 8px; vertical-align: middle; }
  .section-h { background: #1f2937; color: #fff; padding: 8px 14px; font-size: 13px; font-weight: 700; border-radius: 6px 6px 0 0; margin-top: 18px; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb; border-top: none; }
  .data-table th, .data-table td { border: 1px solid #e5e7eb; padding: 7px 8px; text-align: center; vertical-align: middle; }
  .data-table th { background: #f3f4f6; font-weight: 700; color: #111827; }
  .data-table th small { font-weight: 500; color: #6b7280; font-size: 9px; }
  .data-table td.left { text-align: left; }
  .rate-A { background: #d1fae5; color: #059669; font-weight: 700; }
  .rate-B { background: #fed7aa; color: #d97706; font-weight: 700; }
  .rate-C { background: #fecaca; color: #dc2626; font-weight: 700; }
  .grade-A { color: #059669; }
  .grade-B { color: #d97706; }
  .grade-C { color: #dc2626; }
  .grade-criteria-info { margin-top: 18px; padding: 14px 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; font-size: 12px; line-height: 1.8; }
  .grade-criteria-info .grade-criteria-title { font-weight: 700; color: #92400e; margin-bottom: 6px; font-size: 13px; }
  .opinion-box-large { background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 18px; font-size: 13px; color: #111827; line-height: 1.8; min-height: 280px; white-space: pre-wrap; border-radius: 0 0 6px 6px; }
  .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px; }
  .photo-card { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background: #fff; break-inside: avoid; page-break-inside: avoid; }
  .photo-desc { background: #eff6ff; color: #1e40af; padding: 7px 10px; font-size: 11px; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
  .photo-img { width: 100%; height: 260px; object-fit: cover; display: block; background: #f3f4f6; }

  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .page { box-shadow: none; margin: 0; max-width: 100%; padding: 15mm 12mm; min-height: auto; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="window.print()">🖨️ PDF로 저장 / 인쇄</button>
  <button class="cancel" onclick="window.close()">닫기</button>
  <div class="info">💡 "PDF로 저장" 버튼 클릭 후 → 대상에서 <strong>"PDF로 저장"</strong> 선택 → 저장</div>
</div>
${bodyHTML}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(fullHTML);
    printWindow.document.close();

    hideLoading();
    showToast(`✅ PDF 미리보기 창이 열렸습니다 (${allUnits.length}개 호기)`);
  }catch(e){
    hideLoading();
    console.error(e);
    alert('❌ PDF 내보내기 중 오류:\n\n' + (e.message || e));
  }
}
