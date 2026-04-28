// =====================================
// 📋 전역 상수 및 설정
// =====================================

const PHOTO_COUNT = 8;
const PHOTO_MAX_SIZE = 1200;
const PHOTO_QUALITY = 0.75;
const EXCEL_PHOTO_W = 350;
const EXCEL_PHOTO_H = 230;

// 등급 점수
const RATE_SCORE = { A: 1.0, B: 0.6, C: 0.2 };

const fieldConfig = {
  coldSource:['입구온도','출구온도','유량','전류'],
  heatSource:['급수온도','보일러압력','연료유량','배기온도'],
  coolingTower:['환수온도','급수온도','냉각수압력'],
  ahu:['급기온도','환기온도','풍량'],
  fan:['전류','회전수'],
  chilled_pump:['흡입압력','토출압력','유량','전류'],
  hot_pump:['흡입압력','토출압력','유량','전류'],
  cooling_pump:['흡입압력','토출압력','유량','전류'],
  pipe:['부식여부','누수여부','보온상태']
};

const subtypeMap = {
  coldSource: [
    {key:'turbo',       label:'터보냉동기',       icon:'❄️'},
    {key:'absorption',  label:'흡수식 냉동기',    icon:'🌡️'},
    {key:'abs_hw',      label:'흡수식 냉온수기',  icon:'🔄'},
    {key:'ice_storage', label:'빙축열 시스템',    icon:'🧊'}
  ],
  heatSource: [
    {key:'steam',    label:'증기보일러', icon:'♨️'},
    {key:'hotwater', label:'온수보일러', icon:'🔥'}
  ],
  coolingTower: [
    {key:'closed', label:'밀폐형', icon:'🗼'},
    {key:'open',   label:'개방형', icon:'🗼'}
  ]
};

const iconMap = {
  ahu:'💨', fan:'🌀', 
  chilled_pump:'⚙️', hot_pump:'⚙️', cooling_pump:'⚙️', 
  pipe:'🔗'
};

const imageMap = {
  coldSource:"https://images.unsplash.com/photo-1581092160613-1a01b0d6f58c",
  heatSource:"https://images.unsplash.com/photo-1581093588401-12c5cda9e565",
  coolingTower:"https://images.unsplash.com/photo-1581091870622-1c9c62f2f8f2",
  ahu:"https://images.unsplash.com/photo-1581092334394-12c3a0508c1a",
  fan:"https://images.unsplash.com/photo-1581091870622-6a1d73f9cfb0",
  chilled_pump:"https://images.unsplash.com/photo-1581091870622-9e8b97c88f18",
  hot_pump:"https://images.unsplash.com/photo-1581091870622-9e8b97c88f18",
  cooling_pump:"https://images.unsplash.com/photo-1581091870622-9e8b97c88f18",
  pipe:"https://images.unsplash.com/photo-1581093588401-c0cabd2b1d0a"
};

// 가중치 포함된 진단 항목 (현재는 터보냉동기만)
const turboDiagItems = [
  {key:'usage_years', factor:'사용연수', short:'사용연수', weight:0.30, A:'9년 이하', B:'10년 이상 ~ 14년 이하', C:'15년 이상', target:'관리대장'},
  {key:'maint_history', factor:'보수이력', short:'보수이력', weight:0.15, A:'고장 없음', B:'경미한 고장 (1년간 1회 / 과거 2회)', C:'중대한 고장 (과거 4년간 1회 또는 과거 2회 이상)', target:'운전일지, 안전부'},
  {key:'inspection_state', factor:'점검 상태', short:'점검상태', weight:0.10, A:'양호, 정기점검 실시', B:'부분적 간헐 점검', C:'불량, 정기점검 미실시', target:'관리대장'},
  {key:'install_env', factor:'설치 환경', short:'설치환경', weight:0.10, A:'실내, 유지관리 편리, 점검공간 확보, 방진 양호', B:'실내, 유지보수 불편, 점검공간 부족, 방진 부족', C:'옥외, 방진 불량, 보수 불가', target:'육안'},
  {key:'appearance', factor:'외관', short:'외관', weight:0.10, A:'초기 상태 유지, 약간의 오염', B:'심한 오염, 부분 부식', C:'심한 부식 또는 누수 및 파손', target:'육안, 안전부'},
  {key:'temp_measure', factor:'온도 계측', short:'온도계측', weight:0.15, A:'정격 온도 유지', B:'정격 온도보다 2~4℃ 벗어나 운전', C:'정격 온도보다 5℃ 이상 상이', target:'운전일지'},
  {key:'piping_conn', factor:'주위배관 및 연결부', short:'배관/연결부', weight:0.05, A:'초기와 유사한 상태, 일부 부분적 변형 또는 부식 확인', B:'변형, 부식이 외부에서 쉽게 확인됨', C:'손상·변형·누수 상태가 심하여 파괴 위험성을 느끼거나 부식으로 인한 고착으로 작동 불가', target:'육안, 안전부'},
  {key:'mcc_panel', factor:'MCC 및 현장 패널(마이어)', short:'MCC 패널', weight:0.05, A:'계측값 양호', B:'기기 성능은 정상, 계측값만 이상', C:'고장', target:'육안, 안전부'}
];

// 진단을 적용할 설비 타입
const diagApplyTypes = ['coldSource'];

// 전역 상태
let unitCount = {};
let unitSubtype = {};
let unitPhotos = {};

// 헬퍼 함수
function escapeHtml(s){
  if(s==null) return '';
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function hasSubtype(type){ return !!subtypeMap[type]; }
function getSubtypeInfo(type, key){ const list = subtypeMap[type]; if(!list) return null; return list.find(s=>s.key===key) || list[0]; }
function getUnitSubtype(type, id){ if(!hasSubtype(type)) return null; return unitSubtype[`${type}_${id}`] || subtypeMap[type][0].key; }

function labelKor(type){ 
  const map = {coldSource:'냉열원', heatSource:'온열원', coolingTower:'냉각탑', ahu:'공조기', fan:'급·배기팬', chilled_pump:'냉수펌프', hot_pump:'온수펌프', cooling_pump:'냉각수펌프', pipe:'배관설비'}; 
  return map[type]; 
}

function getSubtypeNumber(type, id){
  if(!hasSubtype(type)){
    const container = document.getElementById(type+'Units');
    if(!container) return 0;
    const cards = Array.from(container.querySelectorAll('.card'));
    return cards.findIndex(c => c.dataset.id == id) + 1;
  }
  const mySubtype = getUnitSubtype(type, id);
  const container = document.getElementById(type+'Units');
  if(!container) return 0;
  let count = 0;
  for(const card of container.querySelectorAll('.card')){
    if(getUnitSubtype(type, card.dataset.id) === mySubtype){
      count++;
      if(card.dataset.id == id) return count;
    }
  }
  return 0;
}

function getDisplayName(type, id){
  if(hasSubtype(type)){
    const info = getSubtypeInfo(type, getUnitSubtype(type, id));
    return `${info.label} - ${getSubtypeNumber(type, id)}호기`;
  }
  return `${labelKor(type)} - ${getSubtypeNumber(type, id)}호기`;
}

function getDisplayIcon(type, id){
  if(hasSubtype(type)) return getSubtypeInfo(type, getUnitSubtype(type, id)).icon;
  return iconMap[type] || '🔧';
}

function statusChip(status){
  if(status==='use') return '<span class="status-chip chip-use">🟢 사용</span>';
  if(status==='fail') return '<span class="status-chip chip-fail">🔴 고장</span>';
  if(status==='unused') return '<span class="status-chip chip-unused">⚪ 미사용</span>';
  return '<span style="color:#9ca3af;font-size:11px;">미지정</span>';
}

function statusText(status){
  if(status==='use') return '🟢 사용';
  if(status==='fail') return '🔴 고장';
  if(status==='unused') return '⚪ 미사용';
  return '미지정';
}
