const ACCESS_TOKEN_URL = '/api/access-token';
const REFRESH_TOKEN_URL = '/api/refresh-token';
const LIST_CARRIERS_URL = '/api/list-carriers';

// ขอ Access Token ใหม่
async function requestNewAccessToken() {
    const response = await fetch('/api/access-token', { // 👈 ผ่าน proxy
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: 'w6sipkih6v5lk1fo93m',
        api_secret: '65a53b3c693bb1170f3cf053bafa5f24'
      })
    });
  
    if (!response.ok) {
      const text = await response.text();
      throw new Error('❌ ขอ access token ไม่สำเร็จ: ' + text);
    }
  
    const result = await response.json();
    if (result.success) saveTokens(result.data);
    else throw new Error('❌ Token response invalid');
  }

// ขอ Refresh Token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('busx_refresh_token');
  const response = await fetch(REFRESH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: 'w5p8jnk6v5lk1f6o93m',
      refresh_token: refreshToken
    })
  });

  const result = await response.json();
  if (result.success) saveTokens(result.data);
  else await requestNewAccessToken(); // fallback
}

// บันทึก token และเริ่ม timer refresh
function saveTokens(data) {
  localStorage.setItem('busx_access_token', data.access_token);
  localStorage.setItem('busx_token_expiry', data.expires);
  localStorage.setItem('busx_refresh_token', data.refresh_token);
  startTokenAutoRefresh();
}

// ตั้ง timer ให้ refresh ก่อนหมด 2 นาที
function startTokenAutoRefresh() {
  const expiry = localStorage.getItem('busx_token_expiry');
  if (!expiry) return;

  const now = Math.floor(Date.now() / 1000);
  const refreshIn = (expiry - now - 120) * 1000;

  if (refreshIn > 0) {
    setTimeout(async () => {
      console.log('⏰ Refreshing token...');
      await refreshAccessToken();
    }, refreshIn);
  }
}

// ตรวจสอบว่า token ยัง valid ไหม
function isTokenExpired() {
  const expiry = localStorage.getItem('busx_token_expiry');
  if (!expiry) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= expiry - 60;
}

async function ensureValidAccessToken() {
  if (!localStorage.getItem('busx_access_token')) {
    await requestNewAccessToken();
  } else if (isTokenExpired()) {
    await refreshAccessToken();
  }
}

// โหลดข้อมูล Carrier
async function loadCarriers() {
  await ensureValidAccessToken();
  const token = localStorage.getItem('busx_access_token');
 

  const response = await fetch(LIST_CARRIERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      country: "TH"
    })
  });

  const result = await response.json();
  if (result.success) {
    renderCarrierCards(result.data);
  } else {
    console.error("โหลด list carriers ไม่สำเร็จ:", result.message);
  }
}

function renderCarrierCards(data) {
    const container = document.getElementById("timetable-list");
    container.innerHTML = '';
  
    data.forEach(item => {
      if (!item.carrier_logo) return;
  
      const compcode = item.compcode;
      const slug = encodeURIComponent(item.carrier_name_local); // ภาษาไทยให้ encode ไว้
  
      const link = document.createElement("a");
      link.href = `/api/clone-thairoute?compcode=${compcode}&slug=${slug}`;
      link.className = "timetable-card";
      link.style.textDecoration = 'none';
      link.style.color = 'inherit';
  
      link.innerHTML = `
        <img src="${item.carrier_logo}" alt="${item.carrier_name}" class="timetable-icon" />
        <div class="timetable-content">
          <div class="timetable-name">${item.carrier_name_local}</div>
          <div class="timetable-sub">
            (${item.compcode}) ${item.is_active === 'Y' ? '✅ เปิดใช้งาน' : '❌ ปิด'}
          </div>
        </div>
      `;
  
      container.appendChild(link);
    });
  }
  
  
  
// เริ่มโหลดเมื่อเปิดหน้า
window.onload = () => {
  loadCarriers();
};
