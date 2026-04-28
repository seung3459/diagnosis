// =====================================
// 🔐 인증 및 권한 관리 (ID/PW 방식)
// =====================================

const USER_STORAGE_KEY = 'app_user_info';

let currentUser = null;
let isAuthenticated = false;
let canEdit = false;

// =====================================
// 사용자 정보 저장/조회
// =====================================

function getStoredUser(){
  try{
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if(!stored) return null;
    return JSON.parse(stored);
  } catch(e){
    return null;
  }
}

function setStoredUser(user){
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredUser(){
  localStorage.removeItem(USER_STORAGE_KEY);
  currentUser = null;
  isAuthenticated = false;
  canEdit = false;
}

// =====================================
// ID/PW 검증
// =====================================

function authenticateWithCredentials(id, pw){
  const account = GITHUB_CONFIG.accounts.find(a => a.id === id && a.pw === pw);
  
  if(!account){
    return { success: false, reason: 'invalid_credentials' };
  }
  
  currentUser = {
    id: account.id,
    displayName: account.displayName,
    canEdit: account.canEdit,
    loginAt: new Date().toISOString()
  };
  
  isAuthenticated = true;
  canEdit = account.canEdit;
  
  setStoredUser(currentUser);
  
  console.log(`✅ 로그인 성공: ${currentUser.id} (편집권한: ${canEdit ? '있음' : '없음'})`);
  return { success: true, user: currentUser };
}

// =====================================
// 로그아웃
// =====================================

function logout(){
  if(!confirm('로그아웃하시겠습니까?')) return;
  
  clearStoredUser();
  showToast('✅ 로그아웃 완료');
  setTimeout(() => location.reload(), 500);
}

// =====================================
// 로그인 모달
// =====================================

function showLoginModal(errorMsg){
  const modal = document.getElementById('loginModal');
  if(!modal) return;
  
  const errEl = document.getElementById('loginError');
  if(errorMsg){
    errEl.textContent = `❌ ${errorMsg}`;
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
  
  document.getElementById('loginId').value = '';
  document.getElementById('loginPw').value = '';
  modal.classList.add('active');
  setTimeout(() => document.getElementById('loginId').focus(), 100);
}

// 토큰 모달과의 호환을 위해 별칭
function showTokenModal(errorMsg){
  showLoginModal(errorMsg);
}

function closeLoginModal(){
  document.getElementById('loginModal').classList.remove('active');
}

function submitLogin(){
  const idInput = document.getElementById('loginId');
  const pwInput = document.getElementById('loginPw');
  const errEl = document.getElementById('loginError');
  
  const id = idInput.value.trim();
  const pw = pwInput.value.trim();
  
  if(!id || !pw){
    errEl.textContent = '❌ ID와 비밀번호를 모두 입력해주세요';
    errEl.style.display = 'block';
    return;
  }
  
  const result = authenticateWithCredentials(id, pw);
  
  if(result.success){
    closeLoginModal();
    
    if(result.user.canEdit){
      showToast(`✅ 환영합니다, ${result.user.displayName}님! (편집 가능)`);
    } else {
      showToast(`👀 ${result.user.displayName}로 로그인되었습니다`);
    }
    
    updateAuthUI();
    
    if(typeof loadProjectsList === 'function'){
      loadProjectsList().then(() => {
        if(typeof renderProjectsTable === 'function'){
          renderProjectsTable();
        }
      });
    }
  } else {
    errEl.textContent = '❌ ID 또는 비밀번호가 올바르지 않습니다';
    errEl.style.display = 'block';
    pwInput.value = '';
    pwInput.focus();
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
      <span class="auth-icon">${canEdit ? '👤' : '👁️'}</span>
      <span class="auth-login">${currentUser.displayName}</span>
      ${editBadge}
      <button class="auth-logout" onclick="logout()" title="로그아웃">🚪</button>
    `;
    authStatus.style.display = 'flex';
  } else {
    authStatus.innerHTML = `
      <button class="auth-login-btn" onclick="showLoginModal()">🔐 로그인</button>
    `;
    authStatus.style.display = 'flex';
  }
  
  // 편집 권한에 따라 저장 버튼 활성/비활성
  const saveBtn = document.querySelector('.topbar button[onclick="manualSave()"]');
  if(saveBtn){
    if(canEdit){
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.title = 'GitHub에 저장';
    } else {
      saveBtn.disabled = !isAuthenticated ? false : true;
      saveBtn.style.opacity = !isAuthenticated ? '1' : '0.4';
      saveBtn.title = isAuthenticated ? '편집 권한이 없습니다' : '로그인 필요';
    }
  }
}

// =====================================
// 페이지 로드 시 자동 인증
// =====================================

async function initAuth(){
  const stored = getStoredUser();
  
  if(!stored){
    showLoginModal();
    return false;
  }
  
  // 저장된 사용자 정보 복원 + 검증
  const account = GITHUB_CONFIG.accounts.find(a => a.id === stored.id);
  if(!account){
    clearStoredUser();
    showLoginModal('계정 정보가 변경되었습니다. 다시 로그인해주세요.');
    return false;
  }
  
  currentUser = {
    id: account.id,
    displayName: account.displayName,
    canEdit: account.canEdit,
    loginAt: stored.loginAt
  };
  isAuthenticated = true;
  canEdit = account.canEdit;
  
  console.log(`✅ 자동 로그인: ${currentUser.id}`);
  updateAuthUI();
  return true;
}
