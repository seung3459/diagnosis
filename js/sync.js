// =====================================
// 🔄 프로젝트 동기화
// =====================================

let isSyncing = false;

// =====================================
// 로딩 헬퍼
// =====================================

function showLoading(text){
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingText');
  if(textEl) textEl.textContent = text || '처리 중...';
  if(overlay) overlay.classList.add('active');
}

function hideLoading(){
  const overlay = document.getElementById('loadingOverlay');
  if(overlay) overlay.classList.remove('active');
}
