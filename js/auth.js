// =====================================
// 🔐 GitHub Token 인증 (기존 HTML 구조에 맞춤)
// =====================================

let currentUser = null;
let isAuthenticated = false;
let canEdit = true; // 토큰 입력 사용자는 모두 편집 가능

// =====================================
// 토큰 모달 표시
// =====================================

function showTokenModal(errorMsg){
  const modal = document.getElementById('tokenModal');
  if(!modal) return;
  
  const errEl = document.getElementById('tokenError');
  if(errorMsg && errEl){
    errEl.textContent = errorMsg;
    errEl.style.display = 'block';
  } else if(errEl){
    errEl.style.display = 'none';
  }
  
  const input = document.getElementById('tokenInput');
  if(input) input.value = '';
  
  modal.classList.add('active');
  setTimeout(() => input?.focus(), 100);
}

// 호환성 유지
function showLoginModal(errorMsg){ showTokenModal(errorMsg); }

function closeTokenModal(){
  document.getElementById('tokenModal')?.classList.remove('active');
}

// =====================================
// 토큰 제출
// =====================================

async function submitToken(){
  const input = document.getElementById('tokenInput');
  const errEl = document.getElementById('tokenError');
  const token = (input?.value || '').trim();
  
  if(!errEl || !input) return;
  
  if(!token){
    errEl.textContent = '❌ 토큰을 입력해주세요';
    errEl.style.display = 'block';
    return;
  }
  
  if(!token.startsWith('ghp_') && !token.startsWith('github_pat_')){
    errEl.textContent = '❌ 유효한 GitHub Token 형식이 아닙니다 (ghp_ 또는 github_pat_)';
    errEl.style.display = 'block';
    return;
  }
  
  if(typeof showLoading === 'function') showLoading('토큰 검증 중...');
  
  try {
    const result = await verifyToken(token);
    
    if(typeof hideLoading === 'function') hideLoading();
    
    if(!result.valid){
      errEl.textContent = `❌ 토큰이 유효하지 않습니다 (${result.status || result.error || 'Unknown'})`;
      errEl.style.display = 'block';
      return;
    }
    
    // 토큰 저장
    setStoredToken(token);
    currentUser = result.user;
    isAuthenticated = true;
    
    closeTokenModal();
    
    if(typeof showToast === 'function'){
      showToast(`✅ 환영합니다, ${result.user.login}님!`);
    }
    
    updateAuthUI();
    
    // 프로젝트 목록 갱신 (있으면)
    if(typeof renderProjectsList === 'function'){
      try { renderProjectsList(); } catch(e){ console.warn(e); }
    }
    if(typeof loadProjects === 'function'){
      try { await loadProjects(); } catch(e){ console.warn(e); }
    }
  } catch(e){
    if(typeof hideLoading === 'function') hideLoading();
    errEl.textContent = '❌ 오류: ' + e.message;
    errEl.style.display = 'block';
  }
}

// =====================================
// 로그아웃
// =====================================

function logout(){
  if(!confirm('로그아웃하시겠습니까?')) return;
  clearStoredToken();
  currentUser = null;
  isAuthenticated = false;
  if(typeof showToast === 'function') showToast('✅ 로그아웃 완료');
  setTimeout(() => location.reload(), 800);
}

// =====================================
// UI 업데이트
// =====================================

function updateAuthUI(){
  const authStatus = document.getElementById('authStatus');
  if(!authStatus) return;
  
  if(isAuthenticated && currentUser){
    authStatus.innerHTML = `
      <img src="${currentUser.avatar_url}" class="auth-avatar" alt="">
      <span class="auth-login">${currentUser.login}</span>
      <span class="auth-edit">✏️ 편집</span>
      <button class="auth-logout" onclick="logout()" title="로그아웃">🚪</button>
    `;
    authStatus.style.display = 'flex';
  } else {
    authStatus.innerHTML = `<button class="auth-login-btn" onclick="showTokenModal()">🔐 로그인</button>`;
    authStatus.style.display = 'flex';
  }
}

// =====================================
// 자동 인증
// =====================================

async function initAuth(){
  const token = getStoredToken();
  
  if(!token){
    showTokenModal();
    return false;
  }
  
  try {
    const result = await verifyToken(token);
    
    if(!result.valid){
      clearStoredToken();
      showTokenModal('저장된 토큰이 만료되었습니다. 다시 입력해주세요.');
      return false;
    }
    
    currentUser = result.user;
    isAuthenticated = true;
    updateAuthUI();
    return true;
  } catch(e){
    console.error('자동 인증 실패:', e);
    showTokenModal('인증 중 오류가 발생했습니다.');
    return false;
  }
}

// =====================================
// 페이지 로드 시 자동 시작
// =====================================

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  setTimeout(initAuth, 100);
}

// Enter 키로 로그인
document.addEventListener('keydown', function(e){
  const modal = document.getElementById('tokenModal');
  if(modal && modal.classList.contains('active') && e.key === 'Enter'){
    e.preventDefault();
    submitToken();
  }
});
