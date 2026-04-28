// =====================================
// 🔐 토큰 입력 방식 인증
// =====================================

let currentUser = null;
let isAuthenticated = false;

// =====================================
// 토큰 모달 표시
// =====================================

function showTokenModal(errorMsg){
  const modal = document.getElementById('loginModal');
  if(!modal) return;
  
  const errEl = document.getElementById('loginError');
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

function showLoginModal(errorMsg){ showTokenModal(errorMsg); }

function closeTokenModal(){
  document.getElementById('loginModal')?.classList.remove('active');
}

// =====================================
// 토큰 제출
// =====================================

async function submitToken(){
  const input = document.getElementById('tokenInput');
  const errEl = document.getElementById('loginError');
  const token = input.value.trim();
  
  if(!token){
    errEl.textContent = '❌ 토큰을 입력해주세요';
    errEl.style.display = 'block';
    return;
  }
  
  if(!token.startsWith('ghp_') && !token.startsWith('github_pat_')){
    errEl.textContent = '❌ 유효한 GitHub Token 형식이 아닙니다';
    errEl.style.display = 'block';
    return;
  }
  
  if(typeof showLoading === 'function') showLoading('토큰 검증 중...');
  
  const result = await verifyToken(token);
  
  if(typeof hideLoading === 'function') hideLoading();
  
  if(!result.valid){
    errEl.textContent = `❌ 토큰이 유효하지 않습니다 (${result.status || result.error})`;
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
  
  // 프로젝트 로드
  if(typeof loadProjectsList === 'function'){
    await loadProjectsList();
    if(typeof renderProjectsTable === 'function'){
      renderProjectsTable();
    }
  }
}

function submitLogin(){ submitToken(); }

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
// 자동 인증 (저장된 토큰)
// =====================================

async function initAuth(){
  const token = getStoredToken();
  
  if(!token){
    showTokenModal();
    return false;
  }
  
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
}

// 호환을 위한 변수 (canEdit 항상 true)
let canEdit = true;
