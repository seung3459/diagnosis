// =====================================
// 🐙 GitHub API 통신 라이브러리 (토큰 입력 방식)
// =====================================

const GITHUB_CONFIG = {
  owner: 'seung3459',
  repo: 'diagnosis',
  branch: 'main',
  dataPath: 'data'
};

const GH_API = 'https://api.github.com';

// =====================================
// 🔐 토큰 관리
// =====================================

const TOKEN_KEY = 'github_pat_token';

function getStoredToken(){
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setStoredToken(token){
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken(){
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(){
  const token = getStoredToken();
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

// =====================================
// 토큰 검증
// =====================================

async function verifyToken(token){
  try{
    const res = await fetch(`${GH_API}/user`, {
      headers: { 'Authorization': `token ${token}` }
    });
    if(res.status === 200){
      const user = await res.json();
      return { valid: true, user };
    }
    return { valid: false, status: res.status };
  } catch(e){
    return { valid: false, error: e.message };
  }
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
// 📋 프로젝트 데이터
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
    `프로젝트 목록 업데이트`
  );
}

async function ghLoadProjectData(projectId){
  const result = await ghGetFile(`${GITHUB_CONFIG.dataPath}/${projectId}.json`);
  if(!result) return null;
  return result.content;
}

async function ghSaveProjectData(projectId, data){
  return await ghSaveFile(
    `${GITHUB_CONFIG.dataPath}/${projectId}.json`,
    data,
    `프로젝트 데이터 저장: ${data.projectName || projectId}`
  );
}

async function ghDeleteProjectData(projectId){
  return await ghDeleteFile(
    `${GITHUB_CONFIG.dataPath}/${projectId}.json`,
    `프로젝트 삭제: ${projectId}`
  );
}
