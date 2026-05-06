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
  coolingTower:['냉각수 입구온도','냉각수 출구온도','냉각수 유량','외기 건구온도','외기 습구온도','전기 동력','전류'],
  ahu:['급기온도','환기온도','풍량', '주파수'],
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
    {key:'closed',   label:'밀폐형', icon:'🗼'},
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

// 가중치 포함된 진단 항목 (터보냉동기 등 열원설비용)
const turboDiagItems = [
  {key:'usage_years', factor:'사용연수', short:'사용연수', weight:0.30,
	A:'9년 이하',
	B:'10년 이상 ~ 14년 이하',
	C:'15년 이상',
	target:'관리대장'},
  {key:'maint_history', factor:'보수이력', short:'보수이력', weight:0.15,
	A:'고장 없음',
	B:'경미한 고장 (1년간 1회 / 과거 2회)',
	C:'중대한 고장 (과거 4년간 1회 또는 과거 2회 이상)',
	target:'운전일지, 안전부'},
  {key:'inspection_state', factor:'점검 상태', short:'점검상태', weight:0.10,
	A:'양호, 정기점검 실시',
	B:'부분적 간헐 점검',
	C:'불량, 정기점검 미실시',
	target:'관리대장'},
  {key:'install_env', factor:'설치 환경', short:'설치환경', weight:0.10,
	A:'실내, 유지관리 편리, 점검공간 확보, 방진 양호',
	B:'실내, 유지보수 불편, 점검공간 부족, 방진 부족',
	C:'옥외, 방진 불량, 보수 불가',
	target:'육안'},
  {key:'appearance', factor:'외관', short:'외관', weight:0.10,
	A:'초기 상태 유지, 약간의 오염',
	B:'심한 오염, 부분 부식',
	C:'심한 부식 또는 누수 및 파손',
	target:'육안, 안전부'},
  {key:'temp_measure', factor:'온도 계측', short:'온도계측', weight:0.15,
	A:'정격 온도 유지',
	B:'정격 온도보다 2~4℃ 벗어나 운전',
	C:'정격 온도보다 5℃ 이상 상이',
	target:'운전일지'},
  {key:'piping_conn', factor:'주위배관 및 연결부', short:'배관/연결부', weight:0.05,
	A:'초기와 유사한 상태, 일부 부분적 변형 또는 부식 확인',
	B:'변형, 부식이 외부에서 쉽게 확인됨',
	C:'손상·변형·누수 상태가 심하여 파괴 위험성을 느끼거나 부식으로 인한 고착으로 작동 불가',
	target:'육안, 안전부'},
  {key:'mcc_panel', factor:'MCC 및 현장 패널<br>(마이컴)', short:'MCC 패널', weight:0.05,
	A:'계측값 양호',
	B:'기기 성능은 정상, 계측값만 이상',
	C:'고장',
	target:'육안, 안전부'}
];

// 🆕 공조기(AHU) 진단 항목
const ahuDiagItems = [
  {key:'usage_years', factor:'사용연수', short:'사용연수', weight:0.45,
    A:'9년 이하',
    B:'10년 이상 ~ 14년 이하',
    C:'15년 이상',
    target:'관리대장'},
  {key:'maint_history', factor:'보수이력', short:'보수이력', weight:0.10,
    A:'고장 없음',
    B:'경미한 고장 (1년간 1회 / 과거 2회)',
    C:'중대한 고장 (과거 1년간 1회 또는 과거 2회 이상)',
    target:'운전일지, 인터뷰'},
  {key:'inspection_state', factor:'점검 상태', short:'점검상태', weight:0.05,
    A:'양호, 정기점검',
    B:'보통, 간헐점검',
    C:'불량, 정기점검 미실시',
    target:'관리대장, 인터뷰'},
  {key:'install_env', factor:'설치 환경', short:'설치환경', weight:0.05,
    A:'실내, 유지관리 용이, 점검공간 확보, 방진 양호',
    B:'실내, 유지보수 불편, 점검공간 부족, 방진 부식',
    C:'옥외, 방진 불량, 보수 불가',
    target:'육안'},
  {key:'external_state', factor:'외부상태<br>(부식, 소음)', short:'외부상태', weight:0.05,
    A:'초기상태와 유사, 양호',
    B:'부분 변형 및 부분 부식(경화) 발생',
    C:'심한 부식으로 누수 및 파손',
    target:'육안'},
  {key:'internal_state', factor:'내부상태', short:'내부상태', weight:0.10,
    A:'코일, 필터, 드레인 등 상태 양호',
    B:'코일, 필터 약간 오염 및 부식',
    C:'심한 오염, 부식, 동파 발생',
    target:'육안'},
  {key:'fan_state', factor:'Fan', short:'Fan', weight:0.10,
    A:'고장 없음',
    B:'부분 부식 및 약간 오염',
    C:'심하게 손상 및 부식',
    target:'육안'},
  {key:'control_state', factor:'제어부', short:'제어부', weight:0.10,
    A:'계측값 양호',
    B:'기기성능 정상, 계측값 이상',
    C:'고장',
    target:'육안'}
];

// 🆕 냉각탑(Cooling Tower) 1차 진단 항목
const coolingTowerDiagItems = [
  {
    key:'usage_years',
    factor:'사용연수',
    short:'사용연수',
    weight:0.25,
    A:'9년 이하',
    B:'10년 이상 ~ 14년 이하',
    C:'15년 이상',
    target:'관리대장'
  },
  {
    key:'maint_history',
    factor:'보수이력',
    short:'보수이력',
    weight:0.10,
    A:'고장이 없었음',
    B:'경미한 고장(과거1년간 1회/과거 2회)',
    C:'중대한 고장(과거1년간 1회 또는 과거 2회 이상)',
    target:'운전일지, 인터뷰'
  },
  {
    key:'inspection_state',
    factor:'점검상태',
    short:'점검상태',
    weight:0.10,
    A:'양호, 정기점검',
    B:'보통, 간헐점검',
    C:'불량, 정기점검 미실시',
    target:'관리대장, 인터뷰'
  },
  {
    key:'install_env',
    factor:'설치환경',
    short:'설치환경',
    weight:0.10,
    A:'유지보수 공간 충분, 기류확보 양호(이격거리 만족)하며 1면 이하 장애물, 기초 및 방진 양호',
    B:'유지보수 협소하거나 2면 장애물 또는 방진 부식',
    C:'열교환 불량(이격거리 불량), 3면 이상 장애물, 인접실에 소음·비산 피해, 기초 불량, 방진 일부 누락',
    target:'목측'
  },
  {
    key:'fill_state',
    factor:'충진재',
    short:'충진재',
    weight:0.10,
    A:'형태 및 청결상태 양호',
    B:'부분적 경화 또는 오염',
    C:'심한 변형 또는 파손',
    target:'목측, 인터뷰'
  },
  {
    key:'casing_ladder_hatch',
    factor:'케이싱, 사다리, 점검구',
    short:'케이싱/사다리',
    weight:0.10,
    A:'초기와 유사, 약간 오염(세척가능)',
    B:'심한 오염 또는 부분 부식(경화)',
    C:'심한 부식(경화) 또는 누수 또는 파손',
    target:'목측'
  },
  {
    key:'fan_state',
    factor:'송풍기',
    short:'송풍기',
    weight:0.07,
    A:'이상소음이 없고 기동정지 양호',
    B:'경미한 이상소음',
    C:'심각한 이상소음 또는 파손',
    target:'인터뷰, 목측, 청취'
  },
  {
    key:'control_state',
    factor:'자동제어',
    short:'자동제어',
    weight:0.08,
    A:'양호(균등관 설치도 양호)',
    B:'경미한 제어이상 또는 유량불균형',
    C:'대수제어 불가(2대 이상시) 또는 심각한 유량불균형 또는 고장',
    target:'인터뷰, 목측'
  },
  {
    key:'piping_accessory',
    factor:'주위배관',
    short:'배관/부속',
    weight:0.10,
    A:'초기와 유사한 상태, 또는 일부 부분적인 변형·부식이 확인됨',
    B:'변형, 부식 부위가 많아 쉽게 확인할 수 있음',
    C:'손상, 변형, 누수 상태가 심하여 파괴 위험이 있거나 부식 고착으로 작동 불가',
    target:'목측'
  }
];


// 🆕 장비 타입(+서브타입) → 진단 항목 매핑
function getDiagItems(type, subtype){
  if(type === 'ahu') return ahuDiagItems;
  if(type === 'coolingTower') return coolingTowerDiagItems;
  // coldSource는 모든 서브타입에서 turbo와 동일 항목 사용 (필요 시 서브타입별 분기 가능)
  if(type === 'coldSource') return turboDiagItems;
  return turboDiagItems;  // 기본값
}

// 진단을 적용할 설비 타입
const diagApplyTypes = ['coldSource', 'ahu', 'coolingTower'];  // 🆕 'ahu' 추가

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
