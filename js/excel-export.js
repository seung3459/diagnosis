// =====================================
// 📊 엑셀 내보내기
// 🆕 타입별 진단 항목 지원 (coldSource + ahu)
// =====================================

function dataURLToArrayBuffer(dataURL){
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// 🆕 타입별 라벨/이모지 매핑
function getTypeMeta(type){
const meta = {
  coldSource:   { label:'냉열원',   icon:'❄️', sheetTitle:'냉열원 진단 요약',   defaultName:'냉열원진단' },
  ahu:          { label:'공조기',   icon:'💨', sheetTitle:'공조기 진단 요약',   defaultName:'공조기진단' },
  coolingTower: { label:'냉각탑',   icon:'🗼', sheetTitle:'냉각탑 진단 요약',   defaultName:'냉각탑진단' }
};
  return meta[type] || { label: labelKor(type) || type, icon:'🔧', sheetTitle:`${labelKor(type)||type} 진단 요약`, defaultName:`${type}진단` };
}

// 🆕 일반화된 데이터 수집 함수 (coldSource + ahu 등 모든 진단 적용 타입)
function collectUnitsData(type){
  const container = document.getElementById(`${type}Units`);
  if(!container || container.querySelectorAll('.card').length === 0) return null;

  const projectInfo = {
    projectName: document.getElementById('projectName')?.value || '',
    buildingName: document.getElementById('buildingName')?.value || '',
    projectStartDate: document.getElementById('projectStartDate')?.value || '',
    dateRange: document.getElementById('dateRange')?.value || ''
  };

  const cards = Array.from(container.querySelectorAll('.card'));
  const ordered = [];
  
  // subtype 있으면 subtype 순서로 정렬, 없으면 등록순
  if(hasSubtype(type)){
    subtypeMap[type].forEach(st=>{
      cards.forEach(card=>{
        if(getUnitSubtype(type, card.dataset.id) === st.key){
          ordered.push({card, st});
        }
      });
    });
  } else {
    const meta = getTypeMeta(type);
    cards.forEach(card=>{
      ordered.push({card, st: { key: type, label: meta.label, icon: meta.icon }});
    });
  }

  // 🆕 타입별 진단 항목
  const diagItems = (typeof getDiagItems === 'function') ? getDiagItems(type) : turboDiagItems;

  const allUnits = [];
  let counter = {};
  ordered.forEach(({card, st})=>{
    const id = card.dataset.id;
    counter[st.key] = (counter[st.key]||0) + 1;
    const unitNum = counter[st.key];

    const diag = {};
    diagItems.forEach(item=>{
      const baseKey = `${type}_${id}_diag_${item.key}`;
      const rateEl = document.querySelector(`input[name="${baseKey}_rate"]:checked`);
      const contentEl = document.getElementById(`${baseKey}_content`);
      diag[item.key] = { rate: rateEl ? rateEl.value : '', content: contentEl ? contentEl.value : '' };
    });

    const gradeResult = calculateGrade(diag, type);  // 🆕 type 전달

    const photos = unitPhotos[`${type}_${id}`] || new Array(PHOTO_COUNT).fill(null).map(()=>({img:null,desc:''}));
    const opinion = document.getElementById(`${type}_${id}_opinion`)?.value || '';
    const status = getUnitStatus(type, id);

    allUnits.push({
      type, id, st, subtypeLabel: st.label, unitNum,
      diag, opinion, photos,
      statusText: statusText(status),
      diagRates: diagItems.map(item => diag[item.key]?.rate || '-'),
      grade: gradeResult.grade,
      score: gradeResult.score,
      diagItems  // 🆕 시트 생성 시 사용
    });
  });

  return { projectInfo, allUnits, type, diagItems };
}

// 🔁 기존 함수명 유지 (호환성)
function collectColdSourceData(){
  return collectUnitsData('coldSource');
}

// 🆕 일반화된 종합 요약 시트
function buildSummarySheet(wb, projectInfo, allUnits, type){
  const meta = getTypeMeta(type);
  const diagItems = (typeof getDiagItems === 'function') ? getDiagItems(type) : turboDiagItems;
  const itemCount = diagItems.length;
  
  const ws = wb.addWorksheet(`${meta.label} 종합 요약`, { views: [{ showGridLines: false }] });

  // 🆕 컬럼 너비: [종류, 호기, 상태, ...진단항목들, 점수, 종합]
  // 진단 항목 개수만큼 컬럼 추가 (최소 8개 이상도 유연하게)
  const cols = [
    { width: 18 },  // 종류
    { width: 10 },  // 호기
    { width: 11 }   // 상태
  ];
  for(let i=0; i<itemCount; i++) cols.push({ width: 11 });
  cols.push({ width: 11 });  // 점수
  cols.push({ width: 10 });  // 종합
  ws.columns = cols;

  const totalCols = 3 + itemCount + 2;  // 🆕 동적 컬럼 수
  
  // 안 쓰는 컬럼 숨김
  for(let i = totalCols + 1; i <= 30; i++){
    ws.getColumn(i).hidden = true;
  }

  // 컬럼 인덱스를 엑셀 글자(A,B,C...)로 변환
  const colLetter = (n) => {
    let s = '';
    while(n > 0){
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const lastCol = colLetter(totalCols);

  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = `📊 ${meta.label} 노후화 진단 종합 요약`;
  titleCell.font = { name:'맑은 고딕', size:18, bold:true, color:{argb:'FF1F2937'} };
  titleCell.alignment = { vertical:'middle', horizontal:'center' };
  titleCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'} };
  ws.getRow(1).height = 36;

  let r = 3;
  const infoRows = [
    ['프로젝트명', projectInfo.projectName],
    ['건물명', projectInfo.buildingName],
    ['과업 수행시작일', projectInfo.projectStartDate],
    ['점검 기간', projectInfo.dateRange],
    ['보고서 생성일', new Date().toLocaleString('ko-KR')]
  ];
  infoRows.forEach(([k,v])=>{
    const keyCell = ws.getCell(`A${r}`);
    keyCell.value = k;
    keyCell.font = { bold:true, color:{argb:'FF6B7280'}, name:'맑은 고딕' };
    keyCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF9FAFB'} };
    keyCell.alignment = { vertical:'middle' };
    ws.mergeCells(`B${r}:${lastCol}${r}`);
    const valCell = ws.getCell(`B${r}`);
    valCell.value = v || '';
    valCell.alignment = { vertical:'middle' };
    valCell.font = { name:'맑은 고딕' };
    [`A${r}`,`B${r}`].forEach(addr=>{
      ws.getCell(addr).border = {
        top:{style:'thin',color:{argb:'FFE5E7EB'}}, bottom:{style:'thin',color:{argb:'FFE5E7EB'}},
        left:{style:'thin',color:{argb:'FFE5E7EB'}}, right:{style:'thin',color:{argb:'FFE5E7EB'}}
      };
    });
    r++;
  });

  r += 2;
  ws.mergeCells(`A${r}:${lastCol}${r}`);
  const subTitle = ws.getCell(`A${r}`);
  subTitle.value = `${meta.icon} ${meta.sheetTitle}`;
  subTitle.font = { name:'맑은 고딕', size:14, bold:true };
  subTitle.alignment = { vertical:'middle' };
  ws.getRow(r).height = 28;
  r++;

  ws.mergeCells(`A${r}:${lastCol}${r}`);
  const noteCell = ws.getCell(`A${r}`);
  noteCell.value = '💡 등급 기준: 평가점수 A=1.0, B=0.6, C=0.2 / 가중치 적용 후 100점 만점 / 60점 초과 A, 40~60점 B, 40점 이하 C';
  noteCell.font = { name:'맑은 고딕', size:10, color:{argb:'FF6B7280'}, italic:true };
  noteCell.alignment = { vertical:'middle', horizontal:'left' };
  noteCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFEF3C7'} };
  ws.getRow(r).height = 22;
  r++;

  // 🆕 헤더: 동적 진단 항목
  const headerRow = ['종류','호기','상태'];
  diagItems.forEach(item => headerRow.push(item.short));
  headerRow.push('점수', '종합');

  const hRow = ws.getRow(r);
  hRow.values = headerRow;
  hRow.eachCell((cell)=>{
    cell.font = { bold:true, color:{argb:'FFFFFFFF'}, name:'맑은 고딕' };
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'} };
    cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    cell.border = {
      top:{style:'thin',color:{argb:'FFE5E7EB'}}, bottom:{style:'thin',color:{argb:'FFE5E7EB'}},
      left:{style:'thin',color:{argb:'FFE5E7EB'}}, right:{style:'thin',color:{argb:'FFE5E7EB'}}
    };
  });
  hRow.height = 32;
  r++;

  // 🆕 진단 항목 컬럼 범위 (4 ~ 3+itemCount), 점수 컬럼 (3+itemCount+1), 종합 컬럼 (3+itemCount+2)
  const rateColStart = 4;
  const rateColEnd = 3 + itemCount;
  const scoreCol = rateColEnd + 1;
  const gradeCol = rateColEnd + 2;

  allUnits.forEach(u => {
    const row = ws.getRow(r);
    const scoreText = u.score !== null ? `${u.score}점` : '-';
    row.values = [u.subtypeLabel, `${u.unitNum}호기`, u.statusText, ...u.diagRates, scoreText, u.grade];
    row.eachCell((cell, col)=>{
      cell.alignment = { horizontal:'center', vertical:'middle' };
      cell.font = { name:'맑은 고딕' };
      cell.border = {
        top:{style:'thin',color:{argb:'FFE5E7EB'}}, bottom:{style:'thin',color:{argb:'FFE5E7EB'}},
        left:{style:'thin',color:{argb:'FFE5E7EB'}}, right:{style:'thin',color:{argb:'FFE5E7EB'}}
      };
      // 🆕 진단 항목 셀 색상 (동적 범위)
      if(col >= rateColStart && col <= rateColEnd){
        const v = cell.value;
        if(v==='A') cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1FAE5'} };
        else if(v==='B') cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFED7AA'} };
        else if(v==='C') cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFECACA'} };
      }
      // 점수 컬럼
      if(col === scoreCol){
        cell.font = { name:'맑은 고딕', bold:true, color:{argb:'FF1E40AF'} };
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'} };
      }
      // 종합 등급 컬럼
      if(col === gradeCol){
        cell.font = { name:'맑은 고딕', bold:true, size:14 };
        const v = cell.value;
        if(v==='A'){ cell.font = {...cell.font, color:{argb:'FF059669'}}; cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1FAE5'} }; }
        else if(v==='B'){ cell.font = {...cell.font, color:{argb:'FFD97706'}}; cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFED7AA'} }; }
        else if(v==='C'){ cell.font = {...cell.font, color:{argb:'FFDC2626'}}; cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFECACA'} }; }
      }
    });
    row.height = 24;
    r++;
  });
}

// 🆕 일반화된 호기별 시트 (diagItems를 u에서 받아 처리)
function buildUnitSheet(wb, sheetName, u, projectInfo){
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });

  const colWidths = [3.5, 14, 7, 30, 12, 14, 12, 14, 18, 18, 18, 18, 18, 18];
  colWidths.forEach((w, i) => ws.getColumn(i+1).width = w);

  for(let i = 15; i <= 30; i++){
    ws.getColumn(i).hidden = true;
  }

  const thinBorder = { style:'thin', color:{argb:'FFCBD5E1'} };
  const border = { top:thinBorder, bottom:thinBorder, left:thinBorder, right:thinBorder };

  ws.mergeCells('A1:N2');
  const title = ws.getCell('A1');
  title.value = `🔍 1차 진단 Check : ${u.subtypeLabel} - ${u.unitNum}호기`;
  title.font = { name:'맑은 고딕', size:18, bold:true, color:{argb:'FFFFFFFF'} };
  title.alignment = { vertical:'middle', horizontal:'center' };
  title.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'} };
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 28;

  const infoStartRow = 4;
  const scoreInfo = u.score !== null ? `${u.grade} (${u.score}점)` : '-';
  const infoData = [
    ['프로젝트명', projectInfo.projectName || '-'],
    ['장비명', `${u.subtypeLabel} - ${u.unitNum}호기`],
    ['상태', u.statusText],
    ['종합 등급', scoreInfo]
  ];
  infoData.forEach((row, i) => {
    const r = infoStartRow + i;
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:G${r}`);
    const labelCell = ws.getCell(`A${r}`);
    labelCell.value = row[0];
    labelCell.font = { name:'맑은 고딕', bold:true, size:11, color:{argb:'FF374151'} };
    labelCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF3F4F6'} };
    labelCell.alignment = { vertical:'middle', horizontal:'center' };
    labelCell.border = border;
    const valCell = ws.getCell(`C${r}`);
    valCell.value = row[1];
    valCell.font = { name:'맑은 고딕', size:11 };
    valCell.alignment = { vertical:'middle', horizontal:'left', indent:1 };
    valCell.border = border;
    
    if(row[0] === '종합 등급'){
      if(u.grade === 'A'){ valCell.font = { ...valCell.font, bold:true, color:{argb:'FF059669'} }; valCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1FAE5'} }; }
      else if(u.grade === 'B'){ valCell.font = { ...valCell.font, bold:true, color:{argb:'FFD97706'} }; valCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFED7AA'} }; }
      else if(u.grade === 'C'){ valCell.font = { ...valCell.font, bold:true, color:{argb:'FFDC2626'} }; valCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFECACA'} }; }
    }
    
    ws.getRow(r).height = 22;
  });

  const validPhotos = (u.photos || []).map((p,i)=>({photo:p, idx:i})).filter(x=>x.photo && x.photo.img);
  
  if(validPhotos.length > 0){
    ws.mergeCells('I4:N4');
    const photoTitle = ws.getCell('I4');
    photoTitle.value = '📸 현장 사진';
    photoTitle.font = { name:'맑은 고딕', bold:true, size:13, color:{argb:'FFFFFFFF'} };
    photoTitle.alignment = { vertical:'middle', horizontal:'center' };
    photoTitle.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'} };
    ws.getRow(4).height = 24;

    const photoLayout = [
      { descRow: 5,  imgStartRow: 6  },
      { descRow: 13, imgStartRow: 14 },
      { descRow: 21, imgStartRow: 22 },
      { descRow: 29, imgStartRow: 30 }
    ];

    for(let row = 0; row < Math.ceil(validPhotos.length / 2); row++){
      const layout = photoLayout[row];
      const leftPhoto = validPhotos[row * 2];
      const rightPhoto = validPhotos[row * 2 + 1];

      if(leftPhoto){
        ws.mergeCells(`I${layout.descRow}:K${layout.descRow}`);
        const leftDesc = ws.getCell(`I${layout.descRow}`);
        leftDesc.value = `📷 사진${leftPhoto.idx+1}: ${leftPhoto.photo.desc || ''}`;
        leftDesc.font = { name:'맑은 고딕', bold:true, size:10, color:{argb:'FF1E40AF'} };
        leftDesc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'} };
        leftDesc.alignment = { vertical:'middle', horizontal:'left', indent:1 };
        leftDesc.border = border;

        for(let r = layout.imgStartRow; r < layout.imgStartRow + 7; r++){
          ['I','J','K'].forEach(col => {
            ws.getCell(`${col}${r}`).border = border;
          });
        }

        try{
          const imgId = wb.addImage({
            buffer: dataURLToArrayBuffer(leftPhoto.photo.img),
            extension: 'jpeg'
          });
          ws.addImage(imgId, {
            tl: { col: 8 + 0.05, row: layout.imgStartRow - 1 + 0.05 },
            ext: { width: EXCEL_PHOTO_W, height: EXCEL_PHOTO_H },
            editAs: 'oneCell'
          });
        }catch(e){ console.error(`이미지 임베드 실패:`, e); }
      }

      if(rightPhoto){
        ws.mergeCells(`L${layout.descRow}:N${layout.descRow}`);
        const rightDesc = ws.getCell(`L${layout.descRow}`);
        rightDesc.value = `📷 사진${rightPhoto.idx+1}: ${rightPhoto.photo.desc || ''}`;
        rightDesc.font = { name:'맑은 고딕', bold:true, size:10, color:{argb:'FF1E40AF'} };
        rightDesc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'} };
        rightDesc.alignment = { vertical:'middle', horizontal:'left', indent:1 };
        rightDesc.border = border;

        for(let r = layout.imgStartRow; r < layout.imgStartRow + 7; r++){
          ['L','M','N'].forEach(col => {
            ws.getCell(`${col}${r}`).border = border;
          });
        }

        try{
          const imgId = wb.addImage({
            buffer: dataURLToArrayBuffer(rightPhoto.photo.img),
            extension: 'jpeg'
          });
          ws.addImage(imgId, {
            tl: { col: 11 + 0.05, row: layout.imgStartRow - 1 + 0.05 },
            ext: { width: EXCEL_PHOTO_W, height: EXCEL_PHOTO_H },
            editAs: 'oneCell'
          });
        }catch(e){ console.error(`이미지 임베드 실패:`, e); }
      }

      ws.getRow(layout.descRow).height = 20;
      for(let r = layout.imgStartRow; r < layout.imgStartRow + 7; r++){
        ws.getRow(r).height = 25;
      }
    }
  }

  const checkStartRow = 9;
  ws.mergeCells(`A${checkStartRow}:G${checkStartRow}`);
  const checkTitle = ws.getCell(`A${checkStartRow}`);
  checkTitle.value = '🔍 1차 진단 Check-list (육안점검)';
  checkTitle.font = { name:'맑은 고딕', bold:true, size:13, color:{argb:'FFFFFFFF'} };
  checkTitle.alignment = { vertical:'middle', horizontal:'center' };
  checkTitle.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'} };
  ws.getRow(checkStartRow).height = 24;

  const headerRow = checkStartRow + 1;
  ws.mergeCells(`D${headerRow}:E${headerRow}`);
  ws.mergeCells(`F${headerRow}:G${headerRow}`);
  
  const headers = [
    {col:'A', text:'번호'}, {col:'B', text:'인자'}, {col:'C', text:'평가'},
    {col:'D', text:'주요 내용'}, {col:'F', text:'조사 대상'}
  ];
  headers.forEach(h => {
    const cell = ws.getCell(`${h.col}${headerRow}`);
    cell.value = h.text;
    cell.font = { name:'맑은 고딕', bold:true, size:11, color:{argb:'FFFFFFFF'} };
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF374151'} };
    cell.alignment = { vertical:'middle', horizontal:'center' };
    cell.border = border;
  });
  ['E','G'].forEach(col => {
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF374151'} };
    cell.border = border;
  });
  ws.getRow(headerRow).height = 26;

  // 🆕 u.diagItems 사용 (타입별 진단 항목)
  const diagItems = u.diagItems || turboDiagItems;
  
  diagItems.forEach((item, idx) => {
    const r = headerRow + 1 + idx;
    ws.getRow(r).height = 30;

    const numCell = ws.getCell(`A${r}`);
    numCell.value = idx + 1;
    numCell.font = { name:'맑은 고딕', bold:true, size:11 };
    numCell.alignment = { vertical:'middle', horizontal:'center' };
    numCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'} };
    numCell.border = border;

    const factorCell = ws.getCell(`B${r}`);
    // 🆕 <br> 태그 제거
    const factorText = item.factor.replace(/<br>/g, '\n');
    factorCell.value = factorText;
    factorCell.font = { name:'맑은 고딕', bold:true, size:10 };
    factorCell.alignment = { vertical:'middle', horizontal:'left', indent:1, wrapText:true };
    factorCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF9FAFB'} };
    factorCell.border = border;

    const rateCell = ws.getCell(`C${r}`);
    const rate = u.diag[item.key]?.rate || '';
    rateCell.value = rate;
    rateCell.alignment = { vertical:'middle', horizontal:'center' };
    if(rate === 'A') {
      rateCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1FAE5'} };
      rateCell.font = { name:'맑은 고딕', bold:true, size:14, color:{argb:'FF059669'} };
    } else if(rate === 'B') {
      rateCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFED7AA'} };
      rateCell.font = { name:'맑은 고딕', bold:true, size:14, color:{argb:'FFD97706'} };
    } else if(rate === 'C') {
      rateCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFECACA'} };
      rateCell.font = { name:'맑은 고딕', bold:true, size:14, color:{argb:'FFDC2626'} };
    } else {
      rateCell.font = { name:'맑은 고딕', bold:true, size:14 };
    }
    rateCell.border = border;

    ws.mergeCells(`D${r}:E${r}`);
    const contentCell = ws.getCell(`D${r}`);
    contentCell.value = u.diag[item.key]?.content || '';
    contentCell.font = { name:'맑은 고딕', size:10 };
    contentCell.alignment = { vertical:'middle', horizontal:'left', indent:1, wrapText:true };
    contentCell.border = border;
    ws.getCell(`E${r}`).border = border;

    ws.mergeCells(`F${r}:G${r}`);
    const targetCell = ws.getCell(`F${r}`);
    targetCell.value = item.target;
    targetCell.font = { name:'맑은 고딕', size:10, color:{argb:'FF6B7280'} };
    targetCell.alignment = { vertical:'middle', horizontal:'center', wrapText:true };
    targetCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFAFAFA'} };
    targetCell.border = border;
    ws.getCell(`G${r}`).border = border;
  });

  // 🆕 diagItems.length 사용
  const opinionTitleRow = headerRow + 1 + diagItems.length + 1;
  ws.mergeCells(`A${opinionTitleRow}:G${opinionTitleRow}`);
  const opTitle = ws.getCell(`A${opinionTitleRow}`);
  opTitle.value = '📝 주요 검토 의견';
  opTitle.font = { name:'맑은 고딕', bold:true, size:13, color:{argb:'FFFFFFFF'} };
  opTitle.alignment = { vertical:'middle', horizontal:'center' };
  opTitle.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'} };
  ws.getRow(opinionTitleRow).height = 24;

  const opStartRow = opinionTitleRow + 1;
  const opEndRow = opStartRow + 6;
  ws.mergeCells(`A${opStartRow}:G${opEndRow}`);
  const opCell = ws.getCell(`A${opStartRow}`);
  opCell.value = u.opinion || '(미입력)';
  opCell.font = { name:'맑은 고딕', size:11 };
  opCell.alignment = { vertical:'top', horizontal:'left', wrapText:true, indent:1 };
  opCell.border = border;
  for(let r = opStartRow; r <= opEndRow; r++){
    ws.getRow(r).height = 22;
  }

  ws.pageSetup = {
    paperSize: 9, orientation: 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left:0.4, right:0.4, top:0.5, bottom:0.5, header:0.3, footer:0.3 }
  };
}

// 🆕 메인 엑셀 내보내기 - 진단 적용 모든 타입 통합 출력
async function exportToExcel(){
  if(typeof ExcelJS === 'undefined'){
    alert('ExcelJS 라이브러리가 아직 로드되지 않았습니다.');
    return;
  }

  // 🆕 진단 적용 타입 중 데이터 있는 것 모두 수집
  const allCollected = [];
  diagApplyTypes.forEach(type=>{
    const collected = collectUnitsData(type);
    if(collected) allCollected.push(collected);
  });

  if(allCollected.length === 0){
    alert('⚠️ 내보낼 진단 데이터가 없습니다.\n\n냉열원 또는 공조기를 추가하고 진단을 입력해주세요.');
    return;
  }

  showLoading('엑셀 생성 중...');

  try{
    const projectInfo = allCollected[0].projectInfo;  // 첫 타입의 프로젝트 정보 사용
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HIMEC 진단 시스템';
    wb.created = new Date();

    // 🆕 타입별로 종합 요약 시트 + 호기별 시트 생성
    let totalUnits = 0;
    for(const collected of allCollected){
      const { allUnits, type } = collected;
      const meta = getTypeMeta(type);
      
      showLoading(`${meta.label} 종합 요약 시트 생성 중...`);
      buildSummarySheet(wb, projectInfo, allUnits, type);

      for(let i=0; i<allUnits.length; i++){
        const u = allUnits[i];
        showLoading(`호기별 시트 생성 중... (${++totalUnits})\n${u.subtypeLabel} ${u.unitNum}호기`);
        
        // 🆕 시트 이름에 설비종류 prefix
        let sheetName = `${meta.icon}${u.subtypeLabel.replace(/\s+/g,'')}_${u.unitNum}호기`;
        if(sheetName.length > 31) sheetName = sheetName.substring(0, 31);
        let suffix = 1;
        let finalName = sheetName;
        while(wb.getWorksheet(finalName)){
          finalName = sheetName.substring(0, 28) + `_${suffix}`;
          suffix++;
        }
        buildUnitSheet(wb, finalName, u, projectInfo);
      }
    }

    showLoading('파일 저장 중...');
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const safeName = (projectInfo.projectName || '기계설비진단').replace(/[\\/:*?"<>|]/g,'_');
    const today = new Date().toISOString().slice(0,10);
    saveAs(blob, `${safeName}_${today}.xlsx`);

    hideLoading();
    showToast(`✅ 엑셀 파일 다운로드 완료 (${totalUnits}개 호기, ${allCollected.length}개 설비유형)`);
  }catch(e){
    hideLoading();
    console.error(e);
    alert('❌ 엑셀 내보내기 중 오류:\n\n' + (e.message || e));
  }
}
