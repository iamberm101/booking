// proxy-server.js (แบบเต็ม รองรับ access-token, refresh-token, list-carriers)

const express = require("express");
const fetch = require("node-fetch"); // v2 เท่านั้นสำหรับ CommonJS
const cors = require("cors");
const path = require("path");
const puppeteer = require("puppeteer"); // ⬅️ เพิ่มด้านบนของไฟล์

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve index.html ที่ root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===================== 🔐 Access Token =====================
app.post("/api/access-token", async (req, res) => {
  try {
    console.log("[access-token] payload:", req.body);

    const response = await fetch(
      "https://accounts.busx.com/api/jwt/access_token.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[access-token] fetch failed:", err.message);
    res.status(500).json({ error: "Token fetch failed", detail: err.message });
  }
});

// ===================== 🔁 Refresh Token =====================
app.post("/api/refresh-token", async (req, res) => {
  try {
    console.log("[refresh-token] payload:", req.body);

    const response = await fetch(
      "https://accounts.busx.com/api/jwt/refresh_token.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[refresh-token] fetch failed:", err.message);
    res.status(500).json({ error: "Refresh failed", detail: err.message });
  }
});

// ===================== 🚍 List Carriers =====================
app.post("/api/list-carriers", async (req, res) => {
  try {
    const { access_token, country } = req.body;

    const url = `https://gds.busx.com/api/v1.0/list_carriers?access_token=${encodeURIComponent(
      access_token
    )}&country=${encodeURIComponent(country)}`;

    const response = await fetch(url, {
      method: "GET",
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[list-carriers] fetch failed:", err.message);
    res.status(500).json({ error: "Carrier list failed", detail: err.message });
  }
});

// ✅ เพิ่ม endpoint ใต้ route อื่น ๆ

app.get("/api/scrape-booking", async (req, res) => {
  const targetURL =
    "https://thairoute.com/th-th/timetable/srisiamtour/%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%A2%E0%B8%B2%E0%B8%A1%E0%B8%97%E0%B8%B1%E0%B8%A7%E0%B8%A3%E0%B9%8C";

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "networkidle2" });

    const content = await page.evaluate(() => {
      const section = document.querySelector(".container"); // ✅ เปลี่ยน selector ตามจริง
      return section
        ? section.innerHTML
        : '<p style="color:red;">❌ ไม่พบเนื้อหา</p>';
    });

    await browser.close();

    res.setHeader("Content-Type", "text/html");
    res.send(content);
  } catch (err) {
    console.error("[scrape-booking] error:", err.message);
    res.status(500).send("โหลด booking ไม่สำเร็จ");
  }
});

app.get("/api/clone-thairoute", async (req, res) => {
  const compcode = req.query.compcode || "srisiamtour";
  const slug = req.query.slug || "ศรีสยามทัวร์";
  const url = `https://thairoute.com/th-th/timetable/${compcode}/${encodeURIComponent(
    slug
  )}`;

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    let html = await page.content();

    // ✅ เพิ่ม <base> + BusX widget assets
    html = html.replace(
      "<head>",
      `<head>
  <base href="https://thairoute.com/">
  <link rel="stylesheet" href="https://cdn.busx.com/gds/resources/assets/css/busx-search-form.min.css">
  <script type="module" src="https://cdn.busx.com/gds/resources/assets/js/busx-search-form.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>`
    );

    // ✅ แทรก CSS แดง
    html = html.replace(
      "</head>",
      `
<style>
  /* ✅ แก้ไขระยะห่างด้านบนของ container ที่มี mt-5 */
  body .container.pt-4.pb-0.pb-md-4.mt-5 {
    margin-top: 1.5rem !important;
  }

  /* ✅ จำกัดความกว้างของ layout */
  .container,
  .container-fluid:not(.nav-bar) {
    max-width: 1140px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 15px;
    padding-right: 15px;
  }

  /* ✅ ระยะห่างหลัง navbar */
  .nav-bar + * {
    margin-top: 1rem !important;
  }

  /* ✅ Styling ปุ่ม */
  .btn, .btn-primary, .btn-thr, .btn-outline-primary {
    background-color: #ee0019 !important;
    border-color: #ee0019 !important;
    color: #fff !important;
  }

  .btn:hover, .btn-primary:hover, .btn-outline-primary:hover {
    background-color: #c60015 !important;
    border-color: #c60015 !important;
    color: #fff !important;
  }

  .btn:disabled, .btn[disabled], .btn.disabled {
    background-color: #ee0019 !important;
    border-color: #ee0019 !important;
    opacity: 1 !important;
    color: #fff !important;
  }

  /* ✅ พื้นหลังบาง section */
  .bg-light, .bg-info, .bg-thr-light {
    background-color: #ffe6e9 !important;
  }

  /* ✅ กล่อง tab & accordion */
  .nav-tabs .nav-link.active,
  .accordion .card-header,
  .tab-content {
    background-color: #fff0f0 !important;
  }

  /* ✅ จุดสถานะวงกลม */
  .timeline-step,
  .dot,
  .dot-circle,
  .rounded-circle {
    background-color: #ee0019 !important;
    border-color: #ee0019 !important;
  }

  /* ✅ ลิงก์ทั่วไป */
  a, a:visited, a:hover {
    color: #ee0019 !important;
  }

  /* ✅ Navbar (พื้นหลังโปร่ง + fade-in 0.8s) */
  nav.navbar,
  .nav-bar {
    background-color: rgba(238, 0, 25, 0.9) !important; /* แดงโปร่ง */
    background-image: none !important;
    border-bottom: 1px solid #c60015;
    backdrop-filter: none !important;
    filter: none !important;
    box-shadow: none !important;
    border-top: none !important;
    z-index: 1030;
    padding-top: 12px;
    padding-bottom: 12px;
    opacity: 0;
    animation: fadeInNavbar 0.8s ease forwards; /* ช้าลง */
  }

  @keyframes fadeInNavbar {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .navbar {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    min-height: 72px;
    align-items: center;
  }

  .navbar-brand h1,
  .navbar-brand,
  .navbar-brand span,
  .navbar-brand strong {
    font-size: 2rem;
    margin: 0;
    color: #ffffff !important;
    font-weight: 700;
    display: flex;
    align-items: center;
  }

  .navbar-brand i {
    font-size: 1.8rem;
    margin-right: 0.5rem;
    color: #ffffff !important;
  }

  .navbar-nav .nav-link {
    font-size: 1.05rem;
    padding: 0.5rem 1rem;
    font-weight: 500;
    color: #ffffff !important;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  /* ✅ เพิ่มขีดเส้นใต้ตอน hover */
  .navbar-nav .nav-link:hover,
  .navbar-nav .nav-link.active {
    color: #ffe6e9 !important;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .mt-fixed {
    margin-top: 0rem !important;
  }

  @media (max-width: 991.98px) {
    .navbar-nav .nav-item {
      margin: 0.5rem 0;
    }
  }
</style>

</style>


</head>`
    );

    // ✅ ลบ topbar + navbar เดิม
    html = html.replace(/<nav[^>]*id="navbar"[^>]*>[\s\S]*?<\/nav>/, "");

    // ✅ ลบ footer
    html = html.replace(/<footer[\s\S]*?<\/footer>/, "");

    // ✅ ลบ iframe search widget
    html = html.replace(
      /<div[^>]*class="py-3"[^>]*>\s*<iframe[^>]*id="searchform"[\s\S]*?<\/iframe>\s*<\/div>/,
      `
  <!-- แทนด้วย BusX Search Form -->
  <div id="busx-search-form"
       class="vertical"
       data-url="https://bus-tickets.busx.com"
       data-appkey="d70fabc29b3657f88a6939950b0a607e"
       data-locale="th_TH"
       data-color="#ee0019"
       data-btn="Search">
  </div>`
    );

    // ✅ แทรก Navbar ที่ custom หลัง <body>

    html = html.replace(/<body[^>]*>/, (match) => {
      return `${match}
      <div class="container-fluid nav-bar sticky-top px-0 px-lg-4 py-2 py-lg-0">
        <div class="container">
          <nav class="navbar navbar-expand-lg navbar-light">
            <a href="" class="navbar-brand p-0">
              <h1 class="display-6 text-primary"><i class="fas fa-car-alt me-3"></i>จองตั๋ว</h1>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
              <span class="fa fa-bars"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarCollapse">
              <div class="navbar-nav mx-auto py-0">
                <a href="index.html" class="nav-item nav-link active">หน้าหลัก</a>
                <a href="timetables.html" class="nav-item nav-link">ตารางเดินรถ</a>
                <a href="service.html" class="nav-item nav-link">จัดการการจอง</a>
                <a href="blog.html" class="nav-item nav-link">ประวัติการจอง</a>
                <a href="blog.html" class="nav-item nav-link">เคาน์เตอร์ออกตั๋ว</a>
                <a href="blog.html" class="nav-item nav-link">บทความ</a>
                <a href="blog.html" class="nav-item nav-link">ติดต่อเรา</a>
              </div>
            </div>
          </nav>
        </div>
      </div>`;
    });

    html = html.replace(
      /class="([^"]*?)\bmt-5\b([^"]*?)"/g,
      (match, before, after) => {
        return `class="${before}mt-fixed${after}"`;
      }
    );

    await browser.close();
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).send(`<h1>❌ เกิดข้อผิดพลาด</h1><p>${err.message}</p>`);
  }
});

// ===================== ✅ Start Server =====================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\u{1F680} Proxy Server running at http://localhost:${PORT}`);
});
