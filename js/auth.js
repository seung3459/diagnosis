// =====================================
// 🔐 인증 및 권한 관리
// =====================================

const TOKEN_STORAGE_KEY = 'github_pat_token';
const USER_STORAGE_KEY = 'github_user_info';

let currentUser = null;
let isAuthenticated = false;
let canEdit = false;

// =====================================
// 토큰 저장/조회
// =====================================

function getStoredToken(){
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setStoredToken(token){
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearStoredToken(){
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  currentUser = null;
  isAuthenticated = false;
  canEdit = false;
}

// =====================================
// 토큰 검증 및 사용자 인증
// =====================================

async function authenticateWithToken(token){
  if(token) setStoredToken(token);
  
  const stored = getStoredToken();
  if(!stored){
    isAuthenticated = false;
    canEdit = false;
    return { success: false, reason: 'no_token' };
  }
  
  try{
    currentUser = await ghGetCurrentUser();
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    isAuthenticated = true;
    
    // 편집 권한 검증
    canEdit = GITHUB_CONFIG.allowedUsers.includes(currentUser.login);
    
    console.log(`✅ 인증 성공: ${currentUser.login} (편집권한: ${canEdit ? '있음' : '없음'})`);
    return { success: true, user: currentUser, canEdit };
  } catch(e){
    console.error('❌ 인증 실패:', e);
    clearStoredToken();
    return { success: false, reason: 'invalid_token', error: e.message };
  }
}

// =====================================
// 로그아웃
// =====================================

function logout(){
  if(!confirm('로그아웃하시겠습니까?\n\n• 다음 진입 시 토큰을 다시 입력해야 합니다.\n• 로컬 작업 데이터는 유지됩니다.')) return;
  
  clearStoredToken();
  showToast('✅ 로그아웃 완료');
  setTimeout(() => location.reload(), 800);
}

// =====================================
// 토큰 입력 모달
// =====================================

function showTokenModal(errorMsg){
  const modal = document.getElementById('tokenModal');
  if(!modal) return;
  
  const errEl = document.getElementById('tokenError');
  if(errorMsg){
    errEl.textContent = `❌ ${errorMsg}`;
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
  
  document.getElementById('tokenInput').value = '';
  modal.classList.add('active');
  setTimeout(() => document.getElementById('tokenInput').focus(), 100);
}

function closeTokenModal(){
  document.getElementById('tokenModal').classList.remove('active');
}

async function submitToken(){
  const tokenInput = document.getElementById('tokenInput');
  const token = tokenInput.value.trim();
  
  if(!token){
    document.getElementById('tokenError').textContent = '❌ 토큰을 입력해주세요';
    document.getElementById('tokenError').style.display = 'block';
    return;
  }
  
  if(!token.startsWith('ghp_') && !token.startsWith('github_pat_')){
    document.getElementById('tokenError').textContent = '❌ 유효한 GitHub Token 형식이 아닙니다 (ghp_ 또는 github_pat_ 로 시작)';
    document.getElementById('tokenError').style.display = 'block';
    return;
  }
  
  showLoading('GitHub 인증 중...');
  
  const result = await authenticateWithToken(token);
  
  hideLoading();
  
  if(result.success){
    closeTokenModal();
    
    if(result.canEdit){
      showToast(`✅ 환영합니다, ${result.user.login}님! (편집 가능)`);
    } else {
      showToast(`👀 ${result.user.login}님은 읽기 전용입니다`);
    }
    
    // 인증 상태 UI 업데이트
    updateAuthUI();
    
    // 프로젝트 목록 동기화
    if(typeof loadProjectsList === 'function'){
      await loadProjectsList();
    }
  } else {
    document.getElementById('tokenError').textContent = `❌ 인증 실패: ${result.error || '토큰을 확인해주세요'}`;
    document.getElementById('tokenError').style.display = 'block';
  }
}

// =====================================
// 인증 UI 업데이트
// =====================================

function updateAuthUI(){
  const authStatus = document.getElementById('authStatus');
  if(!authStatus) return;
  
  if(isAuthenticated && currentUser){
    const editBadge = canEdit 
      ? '<span class="auth-edit">✏️ 편집</span>' 
      : '<span class="auth-readonly">👀 읽기</span>';
    
    authStatus.innerHTML = `
      <img src="${currentUser.avatar_url}" class="auth-avatar" alt="">
      <span class="auth-login">${currentUser.login}</span>
      ${editBadge}
      <button class="auth-logout" onclick="logout()" title="로그아웃">🚪</button>
    `;
    authStatus.style.display = 'flex';
  } else {
    authStatus.innerHTML = `
      <button class="auth-login-btn" onclick="showTokenModal()">🔐 로그인</button>
    `;
    authStatus.style.display = 'flex';
  }
  
  // 편집 권한에 따라 버튼 활성/비활성
  const saveBtn = document.querySelector('.topbar button[onclick="manualSave()"]');
  if(saveBtn){
    if(canEdit){
      saveBtn.style.display = '';
      saveBtn.disabled = false;
      saveBtn.title = 'GitHub에 저장';
    } else {
      saveBtn.disabled = true;
      saveBtn.title = '편집 권한이 없습니다';
      saveBtn.style.opacity = '0.4';
    }
  }
}

// =====================================
// 페이지 로드 시 자동 인증
// =====================================

async function initAuth(){
  const token = getStoredToken();
  if(!token){
    // 토큰 없음 → 로그인 모달 표시
    showTokenModal();
    return false;
  }
  
  // 저장된 토큰으로 인증 시도
  const result = await authenticateWithToken();
  
  if(!result.success){
    // 토큰 만료/무효 → 다시 로그인
    showTokenModal('저장된 토큰이 유효하지 않습니다. 다시 입력해주세요.');
    return false;
  }
  
  updateAuthUI();
  return true;
}
