// =====================================
// 📸 사진 처리
// =====================================

function renderPhotoSection(type, id){
  const displayName = getDisplayName(type, id);
  let slots = '';
  for(let i=0; i<PHOTO_COUNT; i++){ slots += renderPhotoSlot(type, id, i); }
  return `
    <div class="section-title photo-section-title">📸 현장 사진 (${displayName})</div>
    <div class="photo-grid" id="${type}_${id}_photoGrid">${slots}</div>
    <div class="photo-hint">💡 사진 영역을 클릭하면 카메라가 실행되거나 파일을 선택할 수 있습니다. (자동 리사이즈)</div>
  `;
}

function renderPhotoSlot(type, id, idx){
  const photos = unitPhotos[`${type}_${id}`];
  const photo = photos && photos[idx] ? photos[idx] : {img:null, desc:''};
  const hasImage = !!photo.img;
  return `
    <div class="photo-slot ${hasImage?'has-image':''}" id="${type}_${id}_slot_${idx}">
      <div class="photo-desc-input">
        <input type="text" placeholder="사진 ${idx+1} 설명 (예: 외관 부식 상태)"
               value="${escapeHtml(photo.desc)}"
               oninput="updatePhotoMeta('${type}',${id},${idx},'desc',this.value)">
      </div>
      <div class="photo-display" onclick="triggerPhotoInput('${type}',${id},${idx})">
        <div class="photo-slot-num">${idx+1}</div>
        ${hasImage ? `
          <img src="${photo.img}" alt="사진${idx+1}">
          <div class="photo-actions">
            <button class="photo-btn" onclick="event.stopPropagation();openPhotoViewer('${type}',${id},${idx})" title="크게 보기">🔍</button>
            <button class="photo-btn" onclick="event.stopPropagation();triggerPhotoInput('${type}',${id},${idx})" title="다시 찍기">🔄</button>
            <button class="photo-btn del" onclick="event.stopPropagation();removePhoto('${type}',${id},${idx})" title="삭제">✕</button>
          </div>
        ` : `
          <div class="photo-empty">
            <div class="cam-icon">📷</div>
            <div class="cam-text">사진 ${idx+1}</div>
            <div class="cam-sub">클릭하여 촬영/선택</div>
          </div>
        `}
      </div>
      <input type="file" accept="image/*" capture="environment" class="photo-hidden-input"
             id="${type}_${id}_input_${idx}"
             onchange="handlePhotoInput(this,'${type}',${id},${idx})">
    </div>
  `;
}

function triggerPhotoInput(type, id, idx){
  const input = document.getElementById(`${type}_${id}_input_${idx}`);
  if(input) input.click();
}

function handlePhotoInput(input, type, id, idx){
  const file = input.files && input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('❌ 이미지 파일만 선택 가능합니다'); return; }
  resizeImage(file, PHOTO_MAX_SIZE, PHOTO_QUALITY).then(dataURL=>{
    if(!unitPhotos[`${type}_${id}`]){
      unitPhotos[`${type}_${id}`] = new Array(PHOTO_COUNT).fill(null).map(()=>({img:null, desc:''}));
    }
    unitPhotos[`${type}_${id}`][idx].img = dataURL;
    const slot = document.getElementById(`${type}_${id}_slot_${idx}`);
    if(slot){
      const wrap = document.createElement('div');
      wrap.innerHTML = renderPhotoSlot(type, id, idx);
      slot.parentElement.replaceChild(wrap.firstElementChild, slot);
    }
    input.value = '';
    showToast(`✅ 사진 ${idx+1} 업로드 완료`);
    updateSummary(type, id);
  }).catch(err=>{ console.error(err); showToast('❌ 이미지 처리 실패'); });
}

function removePhoto(type, id, idx){
  if(!unitPhotos[`${type}_${id}`]) return;
  unitPhotos[`${type}_${id}`][idx].img = null;
  const slot = document.getElementById(`${type}_${id}_slot_${idx}`);
  if(slot){
    const wrap = document.createElement('div');
    wrap.innerHTML = renderPhotoSlot(type, id, idx);
    slot.parentElement.replaceChild(wrap.firstElementChild, slot);
  }
  updateSummary(type, id);
}

function updatePhotoMeta(type, id, idx, field, value){
  if(!unitPhotos[`${type}_${id}`]) return;
  unitPhotos[`${type}_${id}`][idx][field] = value;
}

function resizeImage(file, maxSize, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let {width, height} = img;
        if(width > maxSize || height > maxSize){
          if(width > height){ height = Math.round(height * (maxSize/width)); width = maxSize; }
          else { width = Math.round(width * (maxSize/height)); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openPhotoViewer(type, id, idx){
  const photo = unitPhotos[`${type}_${id}`][idx];
  if(!photo || !photo.img) return;
  document.getElementById('photoViewerImg').src = photo.img;
  document.getElementById('photoViewer').classList.add('active');
}

function closePhotoViewer(){ 
  document.getElementById('photoViewer').classList.remove('active'); 
}
