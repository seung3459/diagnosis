// =====================================
// 📂 프로젝트 목록 관리
// =====================================

// 기본 프로젝트 데이터 (localStorage가 비어있을 때 사용)
const defaultProjects = [
  { year: '2026', name: '영락교회 노후화 진단', note: '' }
];

let projectsList = [];
let currentProject = null;

// 프로젝트 목록 로드
function loadProjectsList(){
  const raw = localStorage.getItem('projectsList');
  if(raw){
    try{
      projectsList = JSON.parse(raw);
    } catch(e){
      projectsList = [...defaultProjects];
    }
  } else {
    projectsList = [...defaultProjects];
    saveProjectsList();
  }
}

// 프로젝트 목록 저장
function saveProjectsList(){
  localStorage.setItem('projectsList', JSON.stringify(projectsList));
}

// 프로젝트 테이블 렌더링
function renderProjectsTable(){
  const tbody = document.getElementById('projectsTableBody');
  if(!tbody) return;
  
  if(projectsList.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="projects-empty">
          📋 등록된 프로젝트가 없습니다. <strong>"+ 새 프로젝트"</strong> 버튼을 눌러 추가하세요.
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  projectsList.forEach((p, idx) => {
    const no = String(idx + 1).padStart(2, '0');
    html += `
      <tr onclick="selectProject(${idx})">
        <td class="no-cell">${no}</td>
        <td class="year-cell">${escapeHtml(p.year)}</td>
        <td class="project-name-cell">${escapeHtml(p.name)}</td>
        <td class="note-cell">${escapeHtml(p.note) || '-'}</td>
        <td class="project-action">
          <button class="action-edit" onclick="event.stopPropagation();editProject(${idx})" title="수정">✏️</button>
          <button class="action-delete" onclick="event.stopPropagation();deleteProject(${idx})" title="삭제">🗑️</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// 프로젝트 선택 → 진단 페이지로 이동
function selectProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  currentProject = project;
  
  // 프로젝트명 자동 입력 (비어있을 때만)
  const projectNameEl = document.getElementById('projectName');
  if(projectNameEl && !projectNameEl.value){
    projectNameEl.value = project.name;
    updateHeroBadge();
  }
  
  showPage('main');
  showToast(`✅ "${project.name}" 프로젝트 진입`);
}

// 새 프로젝트 추가 (간단한 prompt)
function addProjectPrompt(){
  const year = prompt('연도를 입력하세요 (예: 2026)', new Date().getFullYear());
  if(year === null) return;
  if(!year.trim()){
    showToast('❌ 연도를 입력해주세요');
    return;
  }
  
  const name = prompt('프로젝트명을 입력하세요');
  if(name === null) return;
  if(!name.trim()){
    showToast('❌ 프로젝트명을 입력해주세요');
    return;
  }
  
  const note = prompt('비고 (선택사항, 없으면 그냥 확인)') || '';
  if(note === null) return;
  
  projectsList.push({
    year: year.trim(),
    name: name.trim(),
    note: note.trim()
  });
  
  saveProjectsList();
  renderProjectsTable();
  showToast(`✅ "${name}" 프로젝트 추가됨`);
}

// 🆕 프로젝트 수정
function editProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  // 1단계: 프로젝트명 수정
  const newName = prompt('📝 프로젝트명을 수정하세요', project.name);
  if(newName === null) return; // 취소
  if(!newName.trim()){
    showToast('❌ 프로젝트명은 비울 수 없습니다');
    return;
  }
  
  // 2단계: 연도 수정
  const newYear = prompt('📅 연도를 수정하세요', project.year);
  if(newYear === null) return;
  
  // 3단계: 비고 수정
  const newNote = prompt('📌 비고를 수정하세요 (선택사항)', project.note || '');
  if(newNote === null) return;
  
  // 변경사항 적용
  projectsList[idx] = {
    year: newYear.trim() || project.year,
    name: newName.trim(),
    note: newNote.trim()
  };
  
  saveProjectsList();
  renderProjectsTable();
  showToast(`✅ "${newName}" 수정 완료`);
}

// 프로젝트 삭제
function deleteProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  if(!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n※ 진단 데이터는 그대로 유지됩니다.`)) return;
  
  projectsList.splice(idx, 1);
  saveProjectsList();
  renderProjectsTable();
  showToast(`✅ 프로젝트 삭제됨`);
}

// 프로젝트 목록 페이지로 이동
function goToProjects(){
  showPage('projects');
  renderProjectsTable();
}
