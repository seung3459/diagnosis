// =====================================
// 🐙 GitHub API 통신 라이브러리
// =====================================

const GITHUB_CONFIG = {
  owner: 'seung3459',
  repo: 'diagnosis',
  branch: 'main',
  dataPath: 'data',
  
  // ⚠️ 여기에 본인의 GitHub Token을 입력하세요!
  // 시연 후 GitHub에서 이 토큰을 즉시 삭제하세요!
  token: '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',
  
  // ID/PW 등록 (간단 시연용)
  accounts: [
    { id: 'HIMEC', pw: 'HIMEC', canEdit: true,  displayName: 'HIMEC 관리자' },
    { id: 'guest', pw: 'guest', canEdit: false, displayName: '게스트 (읽기 전용)' }
  ]
};

const GH_API = 'https://api.github.com';

// =====================================
// 🔐 인증 헤더 생성
// =====================================

function getAuthHeaders(){
  return {
    'Authorization': `token ${GITHUB_CONFIG.token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

// =====================================
// 📥 파일 가져오기
// =====================================

async function ghGetFile(path){
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`;
  
  try{
    const res = await fetch(url, { headers: getAuthHeaders() });
    if(res.status === 404) return null;
    if(!res.ok) throw new Error(`파일 로드 실패: ${res.status}`);
    
    const data = await res.json();
    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    return {
      content: JSON.parse(content),
      sha: data.sha
    };
  } catch(e){
    if(e.message.includes('404')) return null;
    throw e;
  }
}

// =====================================
// 📤 파일 저장/업데이트
// =====================================

async function ghSaveFile(path, content, commitMessage){
  let sha = null;
  try{
    const existing = await ghGetFile(path);
    if(existing) sha = existing.sha;
  } catch(e){}
  
  const jsonStr = JSON.stringify(content, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));
  
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
  const body = {
    message: commitMessage || `Update ${path}`,
    content: base64Content,
    branch: GITHUB_CONFIG.branch
  };
  if(sha) body.sha = sha;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  
  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(`저장 실패: ${res.status} - ${err.message || 'Unknown'}`);
  }
  
  return await res.json();
}

// =====================================
// 🗑️ 파일 삭제
// =====================================

async function ghDeleteFile(path, commitMessage){
  const existing = await ghGetFile(path);
  if(!existing) return;
  
  const url = `${GH_API}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message: commitMessage || `Delete ${path}`,
      sha: existing.sha,
      branch: GITHUB_CONFIG.branch
    })
  });
  
  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(`삭제 실패: ${res.status} - ${err.message || 'Unknown'}`);
  }
  
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
    `프로젝트 목록 업데이트 (by ${currentUser?.id || 'unknown'})`
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
    `프로젝트 데이터 저장: ${data.projectName || projectId} (by ${currentUser?.id || 'unknown'})`
  );
}

async function ghDeleteProjectData(projectId){
  return await ghDeleteFile(
    `${GITHUB_CONFIG.dataPath}/${projectId}.json`,
    `프로젝트 삭제: ${projectId} (by ${currentUser?.id || 'unknown'})`
  );
}
