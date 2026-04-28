// =====================================
// 🏢 메인 앱 로직
// =====================================

let projectsData = { projects: [] };
let filteredProjects = [];

// =====================================
// 📋 프로젝트 목록 로드
// =====================================

async function loadProjectsList(){
  if(!isAuthenticated){
    console.log('인증 필요');
    return;
  }
  
  try{
    showLoading('프로젝트 목록 불러오는 중...');
    
    const data = await ghLoadProjectsList();
    projectsData = data || { projects: [] };
    filteredProjects = [...projectsData.projects];
    
    hideLoading();
    renderProjectsTable();
  } catch(e){
    hideLoading();
    console.error('프로젝트 로드 실패:', e);
    showToast('❌ 프로젝트 목록 로드 실패: ' + e.message, 'error');
  }
}

// =====================================
// 🔄 새로고침
// =====================================

async function refreshProjects(){
  await loadProjectsList();
  showToast('✅ 새로고침 완료');
}

// =====================================
// 🔍 검색 / 필터
// =====================================

function filterProjects(){
  const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  
  if(!query){
    filteredProjects = [...projectsData.projects];
  } else {
    filteredProjects = projectsData.projects.filter(p => {
      return (p.projectName || '').toLowerCase().includes(query) ||
             (p.address || '').toLowerCase().includes(query) ||
             (p.buildingType || '').toLowerCase().includes(query);
    });
  }
  
  renderProjectsTable();
}

// =====================================
// 📊 테이블 렌더링
// =====================================

function renderProjectsTable(){
  const tbody = document.getElementById('projectsTableBody');
  if(!tbody) return;
  
  if(!isAuthenticated){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-message">
          <div class="empty-icon">🔐</div>
          <div class="empty-text">로그인이 필요합니다</div>
          <div class="empty-subtext">우측 상단 [🔐 로그인] 버튼을 클릭해주세요</div>
        </td>
      </tr>
    `;
    return;
  }
  
  if(!filteredProjects || filteredProjects.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-message">
          <div class="empty-icon">📂</div>
          <div class="empty-text">프로젝트가 없습니다</div>
          <div class="empty-subtext">[➕ 새 프로젝트] 버튼을 클릭해 시작하세요</div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredProjects.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>
        <strong style="color:var(--gray-800);">${escapeHtml(p.projectName || '(이름 없음)')}</strong>
        ${p.buildingType ? `<div style="font-size:11.5px;color:var(--gray-500);margin-top:2px;">🏢 ${escapeHtml(p.buildingType)}</div>` : ''}
      </td>
      <td style="color:var(--gray-600);font-size:13px;">${escapeHtml(p.address || '-')}</td>
      <td style="font-size:12px;color:var(--gray-500);">${formatDate(p.updatedAt || p.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-primary" onclick="openProject('${p.id}')" title="열기">📂 열기</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')" title="삭제">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// =====================================
// ➕ 새 프로젝트 모달
// =====================================

function createNewProject(){
  if(!isAuthenticated){
    showToast('⚠️ 로그인이 필요합니다', 'warning');
    showTokenModal();
    return;
  }
  
  // 입력 초기화
  document.getElementById('newProjectName').value = '';
  document.getElementById('newProjectAddress').value = '';
  document.getElementById('newProjectType').value = '';
  document.getElementById('newProjectMemo').value = '';
  document.getElementById('newProjectError').style.display = 'none';
  
  document.getElementById('newProjectModal').classList.add('active');
  setTimeout(() => document.getElementById('newProjectName').focus(), 100);
}

function closeNewProjectModal(){
  document.getElementById('newProjectModal').classList.remove('active');
}

// =====================================
// 💾 새 프로젝트 저장
// =====================================

async function saveNewProject(){
  const name = document.getElementById('newProjectName').value.trim();
  const address = document.getElementById('newProjectAddress').value.trim();
  const type = document.getElementById('newProjectType').value;
  const memo = document.getElementById('newProjectMemo').value.trim();
  const errEl = document.getElementById('newProjectError');
  
  errEl.style.display = 'none';
  
  if(!name){
    errEl.textContent = '❌ 프로젝트명을 입력해주세요';
    errEl.style.display = 'block';
    return;
  }
  
  // 새 프로젝트 객체
  const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();
  
  const newProject = {
    id: projectId,
    projectName: name,
    address: address,
    buildingType: type,
    memo: memo,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser?.login || 'unknown'
  };
  
  try{
    showLoading('프로젝트 생성 중...');
    
    // 1. 프로젝트 목록에 추가
    if(!projectsData.projects) projectsData.projects = [];
    projectsData.projects.unshift(newProject);
    
    // 2. projects.json 저장
    await ghSaveProjectsList(projectsData);
    
    // 3. 개별 프로젝트 데이터 저장 (빈 데이터)
    const projectData = {
      ...newProject,
      data: {
        // 향후 진단 데이터가 들어갈 곳
        equipments: [],
        diagnosis: {}
      }
    };
    await ghSaveProjectData(projectId, projectData);
    
    hideLoading();
    closeNewProjectModal();
    showToast('✅ 프로젝트가 생성되었습니다');
    
    filteredProjects = [...projectsData.projects];
    renderProjectsTable();
    
  } catch(e){
    hideLoading();
    console.error('프로젝트 생성 실패:', e);
    errEl.textContent = '❌ 생성 실패: ' + e.message;
    errEl.style.display = 'block';
  }
}

// =====================================
// 📂 프로젝트 열기
// =====================================

async function openProject(projectId){
  try{
    showLoading('프로젝트 불러오는 중...');
    
    const data = await ghLoadProjectData(projectId);
    
    hideLoading();
    
    if(!data){
      showToast('❌ 프로젝트 데이터를 찾을 수 없습니다', 'error');
      return;
    }
    
    // TODO: 프로젝트 상세 페이지로 이동 또는 모달 열기
    console.log('프로젝트 데이터:', data);
    showToast(`📂 "${data.projectName}" 프로젝트를 열었습니다`);
    
    // 임시: 데이터 alert으로 확인
    alert(
      `📂 프로젝트 정보\n\n` +
      `이름: ${data.projectName}\n` +
      `주소: ${data.address || '-'}\n` +
      `유형: ${data.buildingType || '-'}\n` +
      `메모: ${data.memo || '-'}\n` +
      `생성일: ${formatDate(data.createdAt)}\n` +
      `생성자: ${data.createdBy || '-'}`
    );
    
  } catch(e){
    hideLoading();
    showToast('❌ 프로젝트 로드 실패: ' + e.message, 'error');
  }
}

// =====================================
// 🗑️ 프로젝트 삭제
// =====================================

async function deleteProject(projectId){
  const project = projectsData.projects.find(p => p.id === projectId);
  if(!project) return;
  
  if(!confirm(`정말 "${project.projectName}" 프로젝트를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)){
    return;
  }
  
  try{
    showLoading('프로젝트 삭제 중...');
    
    // 1. 목록에서 제거
    projectsData.projects = projectsData.projects.filter(p => p.id !== projectId);
    
    // 2. projects.json 업데이트
    await ghSaveProjectsList(projectsData);
    
    // 3. 개별 데이터 파일 삭제
    try{
      await ghDeleteProjectData(projectId);
    } catch(e){
      console.warn('데이터 파일 삭제 실패 (무시):', e);
    }
    
    hideLoading();
    showToast('✅ 프로젝트가 삭제되었습니다');
    
    filteredProjects = [...projectsData.projects];
    renderProjectsTable();
    
  } catch(e){
    hideLoading();
    showToast('❌ 삭제 실패: ' + e.message, 'error');
  }
}

// =====================================
// 🔧 유틸리티
// =====================================

function escapeHtml(str){
  if(!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoStr){
  if(!isoStr) return '-';
  try{
    const d = new Date(isoStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch(e){
    return isoStr;
  }
}
