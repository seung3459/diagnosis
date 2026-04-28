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
          <button onclick="event.stopPropagation();deleteProject(${idx})" title="삭제">🗑️</button>
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
  
  // 프로젝트명 자동 입력
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
  if(!year) return;
  
  const name = prompt('프로젝트명을 입력하세요');
  if(!name || !name.trim()) return;
  
  const note = prompt('비고 (선택사항, 없으면 그냥 확인)') || '';
  
  projectsList.push({
    year: year.trim(),
    name: name.trim(),
    note: note.trim()
  });
  
  saveProjectsList();
  renderProjectsTable();
  showToast(`✅ "${name}" 프로젝트 추가됨`);
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
