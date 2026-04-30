// =====================================
// 🐙 GitHub API 통신 라이브러리
// =====================================
//  - SHA 캐시: 매 저장 후 응답 SHA를 캐시에 보관 → 다음 저장 시 GET 호출 생략
//  - 409 충돌 시 자동 재시도 (최대 2회)
//  - CORS 안전한 헤더만 사용
// =====================================

const GITHUB_CONFIG = {
  owner: 'seung3459',
  repo: 'diagnosis',
  branch: 'main',
  dataPath: 'data',
  // 편집 권한이 있는 GitHub ID 목록
  allowedUsers: ['seung3459', 'eedhals']
};

const GH_API = 'https://api.github.com';

// 🆕 SHA 캐시 (path별 최신 SHA 메모리 보관)
const _shaCache = {};

// =====================================
// 🔐 인증 헤더 생성
// =====================================
function getAuthHeaders(){
  const token = getStoredToken();
  if(!token) return null;
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

// =====================================
// 👤 현재 사용자 정보 가져오기
// =====================================
async function ghGetCurrentUser(){
  const headers = getAuthHeaders();
  if(!headers) throw new Error('토큰이 없습니다');
  
  const res = await fetch(`${GH_API}/user`, { headers });
  if(!res.ok){
    if(res.status === 401) throw new Error('토큰이 유효하지 않습니다');
    throw new Error(`GitHub API 오류: ${res.status}`);
  }
  return await res.json();
}

// =====================================
// 📥 파일 가져오기 (SHA 캐시 갱신)
// =====================================
async function ghGetFile(path){
  const headers = getAuthHeaders();
  if(!headers) throw new Error('인증 필요');
  
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`;
  
  try{
    const res = await fetch(url, { headers });
    
    if(res.status === 404){
      delete _shaCache[path];  // 캐시 제거
      return null;
    }
    if(!res.ok) throw new Error(`파일 로드 실패: ${res.status}`);
    
    const data = await res.json();
    // base64 디코딩 (한글 처리 위해 UTF-8로)
    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    
    // 🆕 SHA 캐시 갱신
    _shaCache[path] = data.sha;
    
    return {
      content: JSON.parse(content),
      sha: data.sha
    };
  } catch(e){
    if(e.message && e.message.includes('404')) return null;
    throw e;
  }
}

// =====================================
// 📤 파일 저장/업데이트 (수정된 버전)
// =====================================
async function ghSaveFile(path, content, commitMessage, _retryCount = 0){
  const headers = getAuthHeaders();
  if(!headers) throw new Error('인증 필요');
  
  // 1. [수정됨] 저장 전 항상 서버에서 최신 SHA를 강제 조회
  delete _shaCache[path]; // 캐시를 비우고
  let sha = null;
  try {
    const existing = await ghGetFile(path); // 서버에서 최신 상태를 받아옴
    if(existing) {
      sha = existing.sha;
    }
  } catch(e) {
    // 파일이 없으면 새로 생성하는 것이므로 sha는 null 유지
  }
  
  // 2. content를 base64로 인코딩 (UTF-8 한글 처리)
  const jsonStr = JSON.stringify(content, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));
  
  // 3. 파일 저장 (PUT)
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
  const body = {
    message: commitMessage || `Update ${path}`,
    content: base64Content,
    branch: GITHUB_CONFIG.branch
  };
  if(sha) body.sha = sha;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  
  // 409 (SHA 충돌) 시 자동 재시도
  if(res.status === 409 && _retryCount < 2){
    console.warn(`[ghSaveFile] SHA 충돌 감지, 재시도 (${_retryCount + 1}/2): ${path}`);
    await new Promise(r => setTimeout(r, 500)); // 0.5초 대기 후 다시 시도
    return ghSaveFile(path, content, commitMessage, _retryCount + 1);
  }
  
  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(`저장 실패: ${res.status} - ${err.message || 'Unknown'}`);
  }
  
  // 성공 시 새 SHA 업데이트
  const result = await res.json();
  if(result.content && result.content.sha){
    _shaCache[path] = result.content.sha;
  }
  
  return result;
}

// =====================================
// 🗑️ 파일 삭제
//  - 409 충돌 시 자동 재시도
// =====================================
async function ghDeleteFile(path, commitMessage, _retryCount = 0){
  const headers = getAuthHeaders();
  if(!headers) throw new Error('인증 필요');
  
  // 1. sha 가져오기 (삭제는 항상 최신 SHA 필요 → GET으로 강제 조회)
  const existing = await ghGetFile(path);
  if(!existing){
    delete _shaCache[path];
    return; // 이미 없음
  }
  
  // 2. 삭제 요청 (DELETE)
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({
      message: commitMessage || `Delete ${path}`,
      sha: existing.sha,
      branch: GITHUB_CONFIG.branch
    })
  });
  
  // 🆕 409 (SHA 충돌) 시 자동 재시도 - 최대 2회
  if(res.status === 409 && _retryCount < 2){
    console.warn(`[ghDeleteFile] SHA 충돌 감지, 재시도 (${_retryCount + 1}/2): ${path}`);
    delete _shaCache[path];
    await new Promise(r => setTimeout(r, 200));
    return ghDeleteFile(path, commitMessage, _retryCount + 1);
  }
  
  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(`삭제 실패: ${res.status} - ${err.message || 'Unknown'}`);
  }
  
  // 🆕 삭제 성공 시 캐시 제거
  delete _shaCache[path];
  
  return await res.json();
}

// =====================================
// 📋 프로젝트 목록 (projects.json)
// =====================================
async function ghLoadProjectsList(){
  const result = await ghGetFile(`${GITHUB_CONFIG.dataPath}/projects.json`);
  if(!result) return { projects: [] };
  return result.content;
}

async function ghSaveProjectsList(data){
  return await ghSaveFile(
    `${GITHUB_CONFIG.dataPath}/projects.json`,
    data,
    `프로젝트 목록 업데이트 (by ${currentUser?.login || 'unknown'})`
  );
}

// =====================================
// 📦 개별 프로젝트 데이터
// =====================================
async function ghLoadProjectData(projectId){
  const result = await ghGetFile(`${GITHUB_CONFIG.dataPath}/${projectId}.json`);
  if(!result) return null;
  return result.content;
}

async function ghSaveProjectData(projectId, data){
  return await ghSaveFile(
    `${GITHUB_CONFIG.dataPath}/${projectId}.json`,
    data,
    `프로젝트 데이터 저장: ${data.projectName || projectId} (by ${currentUser?.login || 'unknown'})`
  );
}

async function ghDeleteProjectData(projectId){
  return await ghDeleteFile(
    `${GITHUB_CONFIG.dataPath}/${projectId}.json`,
    `프로젝트 삭제: ${projectId} (by ${currentUser?.login || 'unknown'})`
  );
}

// =====================================
// 🛠️ 디버깅용 - 캐시 강제 초기화
//  콘솔에서 ghClearShaCache() 실행 가능
// =====================================
function ghClearShaCache(){
  Object.keys(_shaCache).forEach(k => delete _shaCache[k]);
  console.log('[ghClearShaCache] SHA 캐시가 초기화되었습니다');
}
