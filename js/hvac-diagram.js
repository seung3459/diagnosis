// =====================================
// 🧭 HVAC 계통도 편집기
//  - 드래그 앤 드롭 배치
//  - 포트 기반 직선 연결
//  - 배관/덕트 타입 + 색상/스타일 설정
//  - JPG / PDF export
// =====================================

const HVAC_PORTS = ['top', 'right', 'bottom', 'left'];
const HVAC_EQUIPMENT_META = {
  chiller: {
    label: 'Chiller',
    defaultTag: 'CH',
    img: 'img/chiller.svg',
    width: 120,
    height: 72,
    icon: '❄️'
  },
  coolingTower: {
    label: 'Cooling Tower',
    defaultTag: 'CT',
    img: 'img/cooling-tower.svg',
    width: 120,
    height: 72,
    icon: '🗼'
  },
  pump: {
    label: 'Pump',
    defaultTag: 'P',
    img: 'img/pump.svg',
    width: 108,
    height: 66,
    icon: '⚙️'
  }
};

const HVAC_LINE_PRESETS = {
  chilledWater: { label: '냉수', color: '#2563eb', lineStyle: 'solid' },
  hotWater: { label: '온수', color: '#ef4444', lineStyle: 'solid' },
  coolingWater: { label: '냉각수', color: '#06b6d4', lineStyle: 'solid' },
  condenserWater: { label: '냉온수', color: '#8b5cf6', lineStyle: 'dashed' },
  duct: { label: '덕트', color: '#64748b', lineStyle: 'dashed' },
  refrigerant: { label: '냉매', color: '#f59e0b', lineStyle: 'dotted' }
};

const hvacState = {
  initialized: false,
  nodeSeq: 1,
  lineSeq: 1,
  nodes: [],
  links: [],
  selected: null,
  pendingPort: null
};

function initHVACDiagram(){
  if(hvacState.initialized) return;

  const canvasArea = document.getElementById('hvacCanvasArea');
  const canvas = document.getElementById('hvacCanvas');
  const svg = document.getElementById('hvacLinksSvg');
  if(!canvasArea || !canvas || !svg) return;

  bindHVACPaletteEvents();
  bindHVACCanvasEvents();
  syncDefaultPipeTypeToColor();
  renderHVAC();
  hvacState.initialized = true;
}

function bindHVACPaletteEvents(){
  document.querySelectorAll('.hvac-palette-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/hvac-equip', item.dataset.equipType || 'pump');
    });
  });
}

function bindHVACCanvasEvents(){
  const canvasArea = document.getElementById('hvacCanvasArea');
  const canvas = document.getElementById('hvacCanvas');
  if(!canvasArea || !canvas) return;

  canvasArea.addEventListener('dragover', e => {
    e.preventDefault();
    canvasArea.classList.add('drag-over');
  });

  canvasArea.addEventListener('dragleave', e => {
    if(e.target === canvasArea) canvasArea.classList.remove('drag-over');
  });

  canvasArea.addEventListener('drop', e => {
    e.preventDefault();
    canvasArea.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/hvac-equip');
    if(!type) return;
    const pos = getCanvasRelativePoint(e.clientX, e.clientY);
    addHVACNode(type, pos.x, pos.y);
  });

  canvasArea.addEventListener('click', e => {
    if(e.target === canvasArea || e.target.id === 'hvacCanvas' || e.target.id === 'hvacLinksSvg'){
      clearHVACSelection();
    }
  });

  window.addEventListener('resize', () => updateHVACConnections());
}

function getCanvasRelativePoint(clientX, clientY){
  const canvas = document.getElementById('hvacCanvas');
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(30, clientX - rect.left - 60),
    y: Math.max(30, clientY - rect.top - 36)
  };
}

function addHVACNode(type, x, y){
  const meta = HVAC_EQUIPMENT_META[type] || HVAC_EQUIPMENT_META.pump;
  const node = {
    id: `hvac_node_${hvacState.nodeSeq++}`,
    type,
    label: meta.label,
    tag: `${meta.defaultTag}-${String(hvacState.nodeSeq - 1).padStart(2, '0')}`,
    notes: '',
    img: meta.img,
    width: meta.width,
    height: meta.height,
    x,
    y
  };
  hvacState.nodes.push(node);
  selectHVACNode(node.id);
  renderHVAC();
}

function renderHVAC(){
  renderHVACNodes();
  renderHVACLinks();
  renderHVACProperties();
  renderHVACStatus();
}

function renderHVACNodes(){
  const canvas = document.getElementById('hvacCanvas');
  if(!canvas) return;

  canvas.innerHTML = hvacState.nodes.map(node => {
    const meta = HVAC_EQUIPMENT_META[node.type] || HVAC_EQUIPMENT_META.pump;
    const isSelected = hvacState.selected?.kind === 'node' && hvacState.selected.id === node.id;
    return `
      <div class="hvac-node ${isSelected ? 'selected' : ''}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;">
        <button class="hvac-port top ${isPendingPort(node.id, 'top') ? 'pending' : ''}" data-node-id="${node.id}" data-port="top" type="button"></button>
        <button class="hvac-port right ${isPendingPort(node.id, 'right') ? 'pending' : ''}" data-node-id="${node.id}" data-port="right" type="button"></button>
        <button class="hvac-port bottom ${isPendingPort(node.id, 'bottom') ? 'pending' : ''}" data-node-id="${node.id}" data-port="bottom" type="button"></button>
        <button class="hvac-port left ${isPendingPort(node.id, 'left') ? 'pending' : ''}" data-node-id="${node.id}" data-port="left" type="button"></button>
        <div class="hvac-node-body" data-node-body="${node.id}">
          <img src="${node.img}" alt="${meta.label}" onerror="this.style.display='none'">
          <div class="hvac-node-text">
            <strong>${escapeHtml(node.label)}</strong>
            <span>${escapeHtml(node.tag || '')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  canvas.querySelectorAll('.hvac-node').forEach(el => {
    const nodeId = el.dataset.nodeId;
    const body = el.querySelector('[data-node-body]');
    body?.addEventListener('pointerdown', e => startHVACNodeDrag(e, nodeId));
    body?.addEventListener('click', e => {
      e.stopPropagation();
      selectHVACNode(nodeId);
    });
  });

  canvas.querySelectorAll('.hvac-port').forEach(port => {
    port.addEventListener('click', e => {
      e.stopPropagation();
      onHVACPortClick(port.dataset.nodeId, port.dataset.port);
    });
  });
}

function renderHVACLinks(){
  const svg = document.getElementById('hvacLinksSvg');
  const canvasArea = document.getElementById('hvacCanvasArea');
  if(!svg || !canvasArea) return;

  const rect = canvasArea.getBoundingClientRect();
  svg.setAttribute('width', String(Math.round(rect.width)));
  svg.setAttribute('height', String(Math.round(rect.height)));
  svg.setAttribute('viewBox', `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);

  svg.innerHTML = hvacState.links.map(link => {
    const from = getHVACPortPoint(link.fromNodeId, link.fromPort);
    const to = getHVACPortPoint(link.toNodeId, link.toPort);
    if(!from || !to) return '';
    const dash = getHVACStrokeDash(link.lineStyle);
    const isSelected = hvacState.selected?.kind === 'link' && hvacState.selected.id === link.id;
    return `
      <g class="hvac-link-group ${isSelected ? 'selected' : ''}" data-link-id="${link.id}">
        <line class="hvac-link-hit" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="transparent" stroke-width="18"></line>
        <line class="hvac-link-line" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${link.color}" stroke-width="${link.lineWidth || 4}" stroke-dasharray="${dash}" stroke-linecap="round"></line>
        <text class="hvac-link-label" x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 10}" text-anchor="middle">${escapeHtml(getPipeLabel(link.pipeType))}</text>
      </g>
    `;
  }).join('');

  svg.querySelectorAll('.hvac-link-group').forEach(group => {
    group.addEventListener('click', e => {
      e.stopPropagation();
      selectHVACLink(group.dataset.linkId);
    });
  });
}

function getHVACStrokeDash(lineStyle){
  if(lineStyle === 'dashed') return '12 8';
  if(lineStyle === 'dotted') return '3 8';
  return 'none';
}

function getPipeLabel(pipeType){
  return HVAC_LINE_PRESETS[pipeType]?.label || pipeType || '배관';
}

function isPendingPort(nodeId, port){
  return !!hvacState.pendingPort && hvacState.pendingPort.nodeId === nodeId && hvacState.pendingPort.port === port;
}

function getHVACNode(nodeId){
  return hvacState.nodes.find(node => node.id === nodeId) || null;
}

function getHVACLink(linkId){
  return hvacState.links.find(link => link.id === linkId) || null;
}

function getHVACPortPoint(nodeId, port){
  const canvasArea = document.getElementById('hvacCanvasArea');
  const nodeEl = document.querySelector(`.hvac-node[data-node-id="${nodeId}"]`);
  const portEl = document.querySelector(`.hvac-port[data-node-id="${nodeId}"][data-port="${port}"]`);
  if(!canvasArea || !nodeEl || !portEl) return null;
  const areaRect = canvasArea.getBoundingClientRect();
  const portRect = portEl.getBoundingClientRect();
  return {
    x: portRect.left - areaRect.left + portRect.width / 2,
    y: portRect.top - areaRect.top + portRect.height / 2
  };
}

function startHVACNodeDrag(event, nodeId){
  const node = getHVACNode(nodeId);
  const canvas = document.getElementById('hvacCanvas');
  if(!node || !canvas) return;
  event.preventDefault();
  selectHVACNode(nodeId);

  const canvasRect = canvas.getBoundingClientRect();
  const offsetX = event.clientX - canvasRect.left - node.x;
  const offsetY = event.clientY - canvasRect.top - node.y;

  function onMove(e){
    node.x = Math.max(12, Math.min(canvas.clientWidth - node.width - 12, e.clientX - canvasRect.left - offsetX));
    node.y = Math.max(12, Math.min(canvas.clientHeight - node.height - 12, e.clientY - canvasRect.top - offsetY));
    const el = document.querySelector(`.hvac-node[data-node-id="${nodeId}"]`);
    if(el){
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
    }
    updateHVACConnections();
    renderHVACProperties();
  }

  function onUp(){
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function onHVACPortClick(nodeId, port){
  selectHVACNode(nodeId);

  if(!hvacState.pendingPort){
    hvacState.pendingPort = { nodeId, port };
    renderHVAC();
    return;
  }

  if(hvacState.pendingPort.nodeId === nodeId && hvacState.pendingPort.port === port){
    hvacState.pendingPort = null;
    renderHVAC();
    return;
  }

  createHVACLink(hvacState.pendingPort, { nodeId, port });
  hvacState.pendingPort = null;
  renderHVAC();
}

function createHVACLink(from, to){
  if(from.nodeId === to.nodeId) return;

  const pipeType = document.getElementById('hvacDefaultPipeType')?.value || 'chilledWater';
  const color = document.getElementById('hvacDefaultLineColor')?.value || (HVAC_LINE_PRESETS[pipeType]?.color || '#2563eb');
  const lineStyle = document.getElementById('hvacDefaultLineStyle')?.value || 'solid';

  const exists = hvacState.links.some(link => {
    const sameDir = link.fromNodeId === from.nodeId && link.fromPort === from.port && link.toNodeId === to.nodeId && link.toPort === to.port;
    const reverseDir = link.fromNodeId === to.nodeId && link.fromPort === to.port && link.toNodeId === from.nodeId && link.toPort === from.port;
    return sameDir || reverseDir;
  });
  if(exists){
    showToast?.('이미 연결된 포트입니다.');
    return;
  }

  const link = {
    id: `hvac_link_${hvacState.lineSeq++}`,
    fromNodeId: from.nodeId,
    fromPort: from.port,
    toNodeId: to.nodeId,
    toPort: to.port,
    pipeType,
    color,
    lineStyle,
    lineWidth: 4
  };
  hvacState.links.push(link);
  selectHVACLink(link.id);
}

function selectHVACNode(nodeId){
  hvacState.selected = { kind: 'node', id: nodeId };
  renderHVAC();
}

function selectHVACLink(linkId){
  hvacState.selected = { kind: 'link', id: linkId };
  renderHVACProperties();
  renderHVACLinks();
  renderHVACStatus();
}

function clearHVACSelection(){
  hvacState.selected = null;
  hvacState.pendingPort = null;
  renderHVAC();
}

function renderHVACProperties(){
  const panel = document.getElementById('hvacPropertiesPanel');
  if(!panel) return;

  if(!hvacState.selected){
    panel.innerHTML = `
      <div class="hvac-empty-state">
        <strong>선택된 요소가 없습니다.</strong>
        <p>장비를 클릭하면 이름/태그를 수정할 수 있고, 연결선을 클릭하면 타입/색상/스타일을 바꿀 수 있습니다.</p>
      </div>
    `;
    return;
  }

  if(hvacState.selected.kind === 'node'){
    const node = getHVACNode(hvacState.selected.id);
    if(!node) return;
    const meta = HVAC_EQUIPMENT_META[node.type] || HVAC_EQUIPMENT_META.pump;
    panel.innerHTML = `
      <div class="hvac-form-group">
        <label>장비 종류</label>
        <div class="hvac-readonly">${meta.icon} ${escapeHtml(meta.label)}</div>
      </div>
      <div class="hvac-form-group">
        <label>표시명</label>
        <input type="text" value="${escapeAttr(node.label)}" onchange="updateHVACNodeField('${node.id}','label',this.value)">
      </div>
      <div class="hvac-form-group">
        <label>태그</label>
        <input type="text" value="${escapeAttr(node.tag || '')}" onchange="updateHVACNodeField('${node.id}','tag',this.value)">
      </div>
      <div class="hvac-form-group">
        <label>이미지 경로</label>
        <input type="text" value="${escapeAttr(node.img || meta.img)}" onchange="updateHVACNodeField('${node.id}','img',this.value)">
      </div>
      <div class="hvac-form-group">
        <label>메모</label>
        <textarea onchange="updateHVACNodeField('${node.id}','notes',this.value)">${escapeHtml(node.notes || '')}</textarea>
      </div>
      <div class="hvac-coords">위치: X ${Math.round(node.x)} / Y ${Math.round(node.y)}</div>
    `;
    return;
  }

  if(hvacState.selected.kind === 'link'){
    const link = getHVACLink(hvacState.selected.id);
    if(!link) return;
    const options = Object.entries(HVAC_LINE_PRESETS).map(([key, preset]) => `<option value="${key}" ${link.pipeType === key ? 'selected' : ''}>${preset.label}</option>`).join('');
    panel.innerHTML = `
      <div class="hvac-form-group">
        <label>배관/덕트 타입</label>
        <select onchange="updateHVACLinkPreset('${link.id}', this.value)">${options}</select>
      </div>
      <div class="hvac-form-group">
        <label>라인 색상</label>
        <input type="color" value="${link.color}" onchange="updateHVACLinkField('${link.id}','color',this.value)">
      </div>
      <div class="hvac-form-group">
        <label>라인 스타일</label>
        <select onchange="updateHVACLinkField('${link.id}','lineStyle',this.value)">
          <option value="solid" ${link.lineStyle === 'solid' ? 'selected' : ''}>실선</option>
          <option value="dashed" ${link.lineStyle === 'dashed' ? 'selected' : ''}>파선</option>
          <option value="dotted" ${link.lineStyle === 'dotted' ? 'selected' : ''}>점선</option>
        </select>
      </div>
      <div class="hvac-form-group">
        <label>라인 두께</label>
        <input type="range" min="2" max="10" step="1" value="${link.lineWidth || 4}" oninput="updateHVACLinkField('${link.id}','lineWidth',Number(this.value))">
      </div>
      <div class="hvac-coords">연결: ${escapeHtml(link.fromNodeId)} (${link.fromPort}) → ${escapeHtml(link.toNodeId)} (${link.toPort})</div>
    `;
  }
}

function renderHVACStatus(){
  const status = document.getElementById('hvacStatusText');
  if(!status) return;
  if(hvacState.pendingPort){
    status.textContent = `시작 포트 선택됨: ${hvacState.pendingPort.nodeId} / ${hvacState.pendingPort.port} → 연결할 두 번째 포트를 선택하세요.`;
    return;
  }
  if(hvacState.selected?.kind === 'node'){
    status.textContent = '장비가 선택되었습니다. 우측 패널에서 이름/태그/이미지 경로를 수정할 수 있습니다.';
    return;
  }
  if(hvacState.selected?.kind === 'link'){
    status.textContent = '연결선이 선택되었습니다. 우측 패널에서 타입, 색상, 스타일을 편집하세요.';
    return;
  }
  status.textContent = '장비를 배치한 뒤 포트를 순서대로 클릭하면 직선 연결이 생성됩니다.';
}

function updateHVACNodeField(nodeId, field, value){
  const node = getHVACNode(nodeId);
  if(!node) return;
  node[field] = value;
  renderHVAC();
}

function updateHVACLinkField(linkId, field, value){
  const link = getHVACLink(linkId);
  if(!link) return;
  link[field] = value;
  renderHVACLinks();
  renderHVACProperties();
}

function updateHVACLinkPreset(linkId, pipeType){
  const link = getHVACLink(linkId);
  if(!link) return;
  const preset = HVAC_LINE_PRESETS[pipeType] || HVAC_LINE_PRESETS.chilledWater;
  link.pipeType = pipeType;
  link.color = preset.color;
  link.lineStyle = preset.lineStyle;
  renderHVACLinks();
  renderHVACProperties();
}

function syncDefaultPipeTypeToColor(){
  const type = document.getElementById('hvacDefaultPipeType')?.value || 'chilledWater';
  const colorInput = document.getElementById('hvacDefaultLineColor');
  const styleSelect = document.getElementById('hvacDefaultLineStyle');
  const preset = HVAC_LINE_PRESETS[type] || HVAC_LINE_PRESETS.chilledWater;
  if(colorInput) colorInput.value = preset.color;
  if(styleSelect) styleSelect.value = preset.lineStyle;
}

function updateHVACConnections(){
  renderHVACLinks();
}

function deleteSelectedHVACItem(){
  if(!hvacState.selected){
    showToast?.('선택된 요소가 없습니다.');
    return;
  }

  if(hvacState.selected.kind === 'node'){
    const nodeId = hvacState.selected.id;
    hvacState.nodes = hvacState.nodes.filter(node => node.id !== nodeId);
    hvacState.links = hvacState.links.filter(link => link.fromNodeId !== nodeId && link.toNodeId !== nodeId);
  } else if(hvacState.selected.kind === 'link'){
    hvacState.links = hvacState.links.filter(link => link.id !== hvacState.selected.id);
  }

  hvacState.selected = null;
  hvacState.pendingPort = null;
  renderHVAC();
}

function clearHVACDiagram(){
  hvacState.nodes = [];
  hvacState.links = [];
  hvacState.selected = null;
  hvacState.pendingPort = null;
  hvacState.nodeSeq = 1;
  hvacState.lineSeq = 1;
  renderHVAC();
}

function resetHVACDiagram(){
  clearHVACDiagram();
}

function collectHVACDiagramData(){
  return {
    nodeSeq: hvacState.nodeSeq,
    lineSeq: hvacState.lineSeq,
    nodes: hvacState.nodes.map(node => ({ ...node })),
    links: hvacState.links.map(link => ({ ...link }))
  };
}

function applyHVACDiagramData(data){
  if(!hvacState.initialized) initHVACDiagram();
  if(!data){
    clearHVACDiagram();
    return;
  }

  hvacState.nodeSeq = data.nodeSeq || 1;
  hvacState.lineSeq = data.lineSeq || 1;
  hvacState.nodes = Array.isArray(data.nodes) ? data.nodes.map(node => ({ ...node })) : [];
  hvacState.links = Array.isArray(data.links) ? data.links.map(link => ({ ...link })) : [];
  hvacState.selected = null;
  hvacState.pendingPort = null;
  renderHVAC();
}

async function exportHVACToJPG(){
  const target = document.getElementById('hvacCanvasArea');
  if(!target || typeof html2canvas === 'undefined'){
    alert('JPG 내보내기를 위한 라이브러리를 찾을 수 없습니다.');
    return;
  }

  showLoading?.('HVAC 계통도를 JPG로 내보내는 중...');
  try{
    const canvas = await html2canvas(target, { backgroundColor: '#f8fafc', scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.download = `${sanitizeFileName(getHVACExportName())}.jpg`;
    link.click();
  } catch(err){
    console.error(err);
    alert('JPG 내보내기에 실패했습니다.');
  } finally {
    hideLoading?.();
  }
}

async function exportHVACToPDF(){
  const target = document.getElementById('hvacCanvasArea');
  if(!target || typeof html2canvas === 'undefined' || !window.jspdf?.jsPDF){
    alert('PDF 내보내기를 위한 라이브러리를 찾을 수 없습니다.');
    return;
  }

  showLoading?.('HVAC 계통도를 PDF로 내보내는 중...');
  try{
    const canvas = await html2canvas(target, { backgroundColor: '#f8fafc', scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageWidth - w) / 2;
    const y = 10;
    pdf.addImage(imgData, 'PNG', x, y, w, h);
    pdf.save(`${sanitizeFileName(getHVACExportName())}.pdf`);
  } catch(err){
    console.error(err);
    alert('PDF 내보내기에 실패했습니다.');
  } finally {
    hideLoading?.();
  }
}

function getHVACExportName(){
  const projectName = document.getElementById('projectName')?.value?.trim();
  return projectName ? `${projectName}_HVAC계통도` : 'HVAC_계통도';
}

function sanitizeFileName(name){
  return (name || 'HVAC_계통도').replace(/[\\/:*?"<>|]/g, '_');
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value){
  return escapeHtml(value).replace(/`/g, '&#96;');
}
