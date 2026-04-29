// =====================================
// 🎯 등급 계산 (가중치 방식)
// 🆕 타입별 진단 항목 지원 (turbo / ahu)
// =====================================

function calculateGrade(diagData, type){
  // 🆕 타입에 따라 진단 항목 선택 (기본: turboDiagItems)
  const items = (typeof getDiagItems === 'function' && type)
    ? getDiagItems(type)
    : turboDiagItems;
  
  let totalScore = 0;
  let evaluatedCount = 0;
  
  items.forEach(item => {
    const rate = diagData[item.key]?.rate;
    if(rate && RATE_SCORE[rate] !== undefined){
      totalScore += item.weight * RATE_SCORE[rate];
      evaluatedCount++;
    }
  });
  
  if(evaluatedCount === 0){
    return { score: null, grade: '-', gradeCls: 'grade-empty', evaluated: 0 };
  }
  
  const score = Math.round(totalScore * 100 * 10) / 10;
  
  let grade, gradeCls;
  if(score <= 40){ grade = 'C'; gradeCls = 'grade-C'; }
  else if(score <= 60){ grade = 'B'; gradeCls = 'grade-B'; }
  else { grade = 'A'; gradeCls = 'grade-A'; }
  
  return { score, grade, gradeCls, evaluated: evaluatedCount };
}

// 진단 데이터를 폼에서 직접 수집 (등급 계산용)
// 🆕 타입별 진단 항목 사용
function collectDiagFromForm(type, id){
  const items = (typeof getDiagItems === 'function')
    ? getDiagItems(type)
    : turboDiagItems;
  
  const diagData = {};
  items.forEach(item=>{
    const baseKey = `${type}_${id}_diag_${item.key}`;
    const rateEl = document.querySelector(`input[name="${baseKey}_rate"]:checked`);
    diagData[item.key] = { rate: rateEl ? rateEl.value : null };
  });
  return diagData;
}
